const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebsiteAnalysis {
  problem: string;
  targetAudience: string;
  coreFeatures: string[];
  valueProposition: string;
  mainConcept: string;
  keywords: string[];
  summary: string;
}

interface SimilarWebsite {
  name: string;
  url: string;
  description: string;
  similarityScore: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, scanId } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Step 1: Scraping website content from:', formattedUrl);

    // Step 1: Scrape the website using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl scrape error:', scrapeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: scrapeData.error || 'Failed to scrape website. The URL may be inaccessible or blocked.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const websiteContent = scrapeData.data?.markdown || scrapeData.markdown || '';
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!websiteContent || websiteContent.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Could not extract enough content from the website. It may be protected or have limited public content.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Step 2: Analyzing website content with AI...');
    console.log('Content length:', websiteContent.length);

    // Step 2: Analyze the website content with AI
    const analysisPrompt = `Analyze this website content and extract the following information in JSON format:

Website Content:
${websiteContent.substring(0, 8000)}

Website Title: ${metadata.title || 'Unknown'}
Website Description: ${metadata.description || 'Unknown'}

Return a JSON object with these exact fields:
{
  "problem": "The main problem this website/product solves (1-2 sentences)",
  "targetAudience": "Who is the target audience (1-2 sentences)",
  "coreFeatures": ["feature1", "feature2", "feature3", "feature4", "feature5"],
  "valueProposition": "The main value proposition (1-2 sentences)",
  "mainConcept": "A clear summary of what this website/product/idea is about (2-3 sentences)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"],
  "summary": "A comprehensive 3-4 sentence summary of the entire concept"
}

Be specific and extract real information from the content. If information is not available, make reasonable inferences based on the content.`;

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert at analyzing websites and understanding business concepts. Always respond with valid JSON only, no markdown.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const analysisData = await analysisResponse.json();
    let analysis: WebsiteAnalysis;

    try {
      const responseText = analysisData.choices?.[0]?.message?.content || '';
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse analysis response:', parseError);
      // Create a basic analysis from metadata
      analysis = {
        problem: metadata.description || 'Unable to determine',
        targetAudience: 'General users',
        coreFeatures: ['Website service'],
        valueProposition: metadata.description || 'Online service',
        mainConcept: metadata.description || websiteContent.substring(0, 200),
        keywords: (metadata.title || '').split(' ').filter((w: string) => w.length > 3),
        summary: metadata.description || websiteContent.substring(0, 300)
      };
    }

    console.log('Step 3: Searching for similar websites...');

    // Step 3: Search for similar websites using Firecrawl search
    const searchQueries = [
      `${analysis.keywords.slice(0, 3).join(' ')} website startup`,
      `${analysis.mainConcept.split(' ').slice(0, 5).join(' ')} similar`,
      `${analysis.problem.split(' ').slice(0, 4).join(' ')} solution website`,
    ];

    const allSimilarWebsites: SimilarWebsite[] = [];
    const seenUrls = new Set<string>();
    seenUrls.add(formattedUrl.toLowerCase());

    for (const query of searchQueries) {
      try {
        console.log('Searching for:', query);
        
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            limit: 10,
          }),
        });

        const searchData = await searchResponse.json();

        if (searchResponse.ok && searchData.data) {
          for (const result of searchData.data) {
            const resultUrl = result.url?.toLowerCase() || '';
            if (!seenUrls.has(resultUrl) && resultUrl) {
              seenUrls.add(resultUrl);
              allSimilarWebsites.push({
                name: result.title || extractDomainName(result.url),
                url: result.url,
                description: result.description || result.snippet || 'No description available',
                similarityScore: 0, // Will be calculated later
              });
            }
          }
        }
      } catch (searchError) {
        console.error('Search query failed:', query, searchError);
      }
    }

    console.log(`Found ${allSimilarWebsites.length} potential similar websites`);

    // Step 4: Calculate similarity scores using AI
    console.log('Step 4: Calculating similarity scores...');

    const scoredWebsites: SimilarWebsite[] = [];

    // Process in batches to avoid overwhelming the AI
    const batchSize = 5;
    for (let i = 0; i < Math.min(allSimilarWebsites.length, 20); i += batchSize) {
      const batch = allSimilarWebsites.slice(i, i + batchSize);
      
      const scoringPrompt = `Compare the original website concept with these similar websites and provide similarity scores.

ORIGINAL WEBSITE ANALYSIS:
- Main Concept: ${analysis.mainConcept}
- Problem Solved: ${analysis.problem}
- Target Audience: ${analysis.targetAudience}
- Core Features: ${analysis.coreFeatures.join(', ')}
- Keywords: ${analysis.keywords.join(', ')}

WEBSITES TO COMPARE:
${batch.map((w, idx) => `${idx + 1}. ${w.name} (${w.url})
   Description: ${w.description}`).join('\n\n')}

For each website, analyze how similar it is to the original concept. Consider:
- Similar problem being solved
- Overlapping features
- Same target audience
- Related industry/domain

Return a JSON array with similarity scores (0-100) for each website:
[
  {"index": 0, "score": 75, "reason": "Brief explanation of similarity"},
  ...
]

Be realistic with scores. 90+ means nearly identical concept. 70-89 means very similar. 50-69 means moderately similar. Below 50 means loosely related.`;

      try {
        const scoringResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are an expert at comparing business concepts and websites. Always respond with valid JSON only.' },
              { role: 'user', content: scoringPrompt }
            ],
            temperature: 0.2,
          }),
        });

        const scoringData = await scoringResponse.json();
        const scoreText = scoringData.choices?.[0]?.message?.content || '[]';
        const cleanedScores = scoreText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const scores = JSON.parse(cleanedScores);
        
        for (const score of scores) {
          const website = batch[score.index];
          if (website) {
            scoredWebsites.push({
              ...website,
              similarityScore: Math.min(99, Math.max(1, score.score)),
            });
          }
        }
      } catch (scoringError) {
        console.error('Scoring batch failed:', scoringError);
        // Add with estimated scores based on keyword matching
        for (const website of batch) {
          const keywordMatches = analysis.keywords.filter(kw => 
            website.description.toLowerCase().includes(kw.toLowerCase()) ||
            website.name.toLowerCase().includes(kw.toLowerCase())
          ).length;
          scoredWebsites.push({
            ...website,
            similarityScore: Math.min(70, 20 + (keywordMatches * 10)),
          });
        }
      }
    }

    // Sort by similarity score
    scoredWebsites.sort((a, b) => b.similarityScore - a.similarityScore);

    // Take top 10
    const topSimilar = scoredWebsites.slice(0, 10);

    // Calculate overall scores
    const avgSimilarity = topSimilar.length > 0 
      ? Math.round(topSimilar.reduce((sum, w) => sum + w.similarityScore, 0) / topSimilar.length)
      : 0;
    
    const uniquenessScore = Math.max(0, 100 - avgSimilarity);

    console.log('Analysis complete. Found', topSimilar.length, 'similar websites');
    console.log('Average similarity:', avgSimilarity, 'Uniqueness:', uniquenessScore);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scannedUrl: formattedUrl,
          websiteTitle: metadata.title || extractDomainName(formattedUrl),
          analysis,
          similarWebsites: topSimilar,
          overallSimilarityScore: avgSimilarity,
          uniquenessScore,
          scanId,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('WebScan error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '').split('.')[0];
  } catch {
    return url;
  }
}
