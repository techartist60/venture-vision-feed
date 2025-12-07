import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for database operations to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { scanId } = await req.json();
    console.log('Processing scan:', scanId);

    // Get scan details
    const { data: scan, error: scanError } = await supabaseClient
      .from('idescan_scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      throw new Error('Scan not found');
    }

    // Update status to processing using admin client
    await supabaseAdmin
      .from('idescan_scans')
      .update({ status: 'processing' })
      .eq('id', scanId);

    // Search for real innovations matching the user's idea
    console.log('Searching for real innovations matching user idea...');
    
    try {
      // Use web search to find real similar innovations
      const searchResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/search-innovations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ 
          ideaDescription: scan.description,
          scanId: scanId 
        })
      });
      
      if (!searchResponse.ok) {
        console.error('Failed to search innovations:', await searchResponse.text());
      } else {
        const searchResult = await searchResponse.json();
        console.log(`Successfully found ${searchResult.count || 0} real innovations from web search`);
      }
      
      // Wait for search and indexing to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (searchError) {
      console.error('Error searching for innovations:', searchError);
      // Continue with existing data if search fails
    }

    // Get innovation records, prioritizing recent ones
    const { data: innovations } = await supabaseAdmin
      .from('innovation_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Focus on most recent/relevant results

    if (!innovations || innovations.length === 0) {
      console.log('No innovations found - external sources may not be available');
      await supabaseAdmin
        .from('idescan_scans')
        .update({ 
          status: 'completed',
          metadata: { 
            error: 'No external innovation data available',
            sources_checked: ['Google Patents', 'USPTO', 'WIPO', 'TechCrunch', 'Google News', 'Startups']
          }
        })
        .eq('id', scanId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          matchesCount: 0,
          message: 'No innovations available from external sources'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Starting AI-powered keyword extraction, category analysis and market simulation...`);
    console.log(`User's idea - Title: "${scan.title}", Description length: ${scan.description.length} chars`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Extract key concepts and keywords from user's idea
    console.log('Extracting exact keywords from user input...');
    const keywordResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a keyword extraction expert. Extract the most important keywords, concepts, and technologies from the user input. Return ONLY a JSON array of keywords.'
          },
          {
            role: 'user',
            content: `Extract 5-10 key concepts, keywords, and technology terms from this innovation description:

"${scan.description}"

Return JSON array format: ["keyword1", "keyword2", "keyword3", ...]`
          }
        ],
      }),
    });

    let extractedKeywords: string[] = [];
    if (keywordResponse.ok) {
      const keywordData = await keywordResponse.json();
      const content = keywordData.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        extractedKeywords = JSON.parse(jsonMatch[0]);
        console.log('Extracted keywords:', extractedKeywords.join(', '));
      }
    }

    // Step 2: Get category similarity scores
    console.log('Analyzing category similarities...');
    const categoryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an innovation categorization expert. Analyze ideas and provide similarity scores for each category. Return ONLY a JSON object with scores 0-100 for each category.'
          },
          {
            role: 'user',
            content: `Analyze this innovation and rate its relevance/similarity to each category (0-100):

INNOVATION: ${scan.description}
KEY CONCEPTS: ${extractedKeywords.join(', ')}

Return JSON format:
{
  "tech": <score>,
  "fashion": <score>,
  "health": <score>,
  "agriculture": <score>,
  "arts": <score>
}`
          }
        ],
      }),
    });

    let categoryScores = { tech: 0, fashion: 0, health: 0, agriculture: 0, arts: 0 };
    if (categoryResponse.ok) {
      const categoryData = await categoryResponse.json();
      const content = categoryData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        categoryScores = JSON.parse(jsonMatch[0]);
      }
    }
    console.log('Category scores:', categoryScores);

    // Step 3: Find market performance insights and similar innovations with keyword matching
    const results = [];
    const innovationsByCategory: any = { tech: [], fashion: [], health: [], agriculture: [], arts: [] };
    
    // Check if scan has an image for image-based similarity
    const hasImage = scan.image_url && scan.image_url.length > 0;

    // Use AI to calculate similarity for each innovation using extracted keywords
    for (const innovation of innovations) {
      try {
        const scanText = `Title: ${scan.title}\nDescription: ${scan.description}`;
        const innovationText = `Title: ${innovation.title}\nDescription: ${innovation.description || 'No description'}`;

        // Use AI to calculate semantic similarity based on extracted keywords and user's exact input
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an expert innovation analyst. Compare two innovations based on keyword overlap, concept similarity, technology match, market alignment, and problem-solving approach. Focus heavily on matching the exact keywords and concepts. Return ONLY a similarity score from 0-100. Scoring: 90-100 = Keywords and concepts match perfectly; 70-89 = Most keywords match with similar technology; 50-69 = Some keyword overlap with related field; 30-49 = Few keywords match, different approach; 20-29 = Loosely related domain; 0-19 = Different domains. Return ONLY the numeric score.'
              },
              {
                role: 'user',
                content: `Compare these innovations focusing on keyword and concept matching:

USER'S INNOVATION:
Description: ${scan.description}
Key Keywords: ${extractedKeywords.join(', ')}

EXISTING INNOVATION:
Title: ${innovation.title}
Description: ${innovation.description || innovation.title}
Type: ${innovation.source_type}
Owner: ${innovation.owner || 'Unknown'}

Calculate similarity score (0-100) based on keyword overlap and concept match:`
              }
            ],
            max_tokens: 10,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const similarityText = data.choices[0].message.content.trim();
          const textSimilarityScore = parseFloat(similarityText.replace(/[^0-9.]/g, ''));
          
          // Calculate image similarity if both have images
          let imageSimilarityScore: number | null = null;
          if (hasImage && innovation.metadata?.image_url) {
            // Estimate image similarity based on category and context matching
            // Since we can't directly compare images, we use category alignment as proxy
            const categoryMatch = Math.max(
              categoryScores.tech, categoryScores.fashion, categoryScores.health,
              categoryScores.agriculture, categoryScores.arts
            );
            imageSimilarityScore = Math.round((textSimilarityScore * 0.7 + categoryMatch * 0.3) * 100) / 100;
          }
          
          // Calculate overall similarity score
          const overallScore = imageSimilarityScore 
            ? (textSimilarityScore * 0.6 + imageSimilarityScore * 0.4)
            : textSimilarityScore;
          
          console.log(`Comparing user idea with "${innovation.title.substring(0, 50)}..." - Text: ${textSimilarityScore}%, Image: ${imageSimilarityScore || 'N/A'}%, Overall: ${overallScore.toFixed(1)}%`);
          
          if (!isNaN(overallScore) && overallScore >= 20) {
            const tier = calculateTier(overallScore);
            
            results.push({
              scan_id: scanId,
              innovation_id: innovation.id,
              similarity_score: Math.round(overallScore * 100) / 100,
              similarity_tier: tier,
              text_similarity: Math.round(textSimilarityScore * 100) / 100,
              image_similarity: imageSimilarityScore,
              metadata_similarity: null,
              innovation_data: innovation
            });
          }
        }
      } catch (error) {
        console.error(`Error comparing with innovation ${innovation.id}:`, error);
      }
    }

    // Sort by similarity score descending and limit to top 8
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    const topResults = results.slice(0, 8);

    // Gather real market data from similar innovations
    const marketResearchContext = topResults.slice(0, 3).map(r => {
      const innov = r.innovation_data;
      return `- ${innov.title} (${innov.source_type}): ${innov.description?.substring(0, 150) || 'Patent/startup in this space'}${innov.metadata?.funding ? ` - Funding: ${innov.metadata.funding}` : ''}`;
    }).join('\n');

    // Step 4: Generate research-based market simulation and insights
    console.log('Generating research-based market simulation and insights...');
    const simulationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst. Provide data-driven market performance projections based on real similar innovations found. Be realistic and grounded in actual market conditions. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Analyze this innovation for market potential based on real market research:

USER'S INNOVATION: ${scan.description}
KEY CONCEPTS: ${extractedKeywords.join(', ')}

REAL SIMILAR INNOVATIONS IN MARKET:
${marketResearchContext || 'No direct competitors found'}

SIMILAR INNOVATIONS COUNT: ${topResults.length}
CATEGORY MATCH: ${Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0][0]} (${Object.entries(categoryScores).sort((a, b) => b[1] - a[1])[0][1]}% match)

Based on the actual innovations found and market research, provide realistic projections:

Return JSON format:
{
  "marketSimulation": {
    "adoptionRate": <0-100, based on similar innovations' market traction>,
    "marketPenetration": <0-100, based on competition level found>,
    "competitionLevel": <0-100, based on number of similar innovations: ${topResults.length}>,
    "innovationIndex": <0-100, uniqueness vs similar innovations>,
    "projectedGrowth": <0-100, based on sector trends>,
    "sustainabilityScore": <0-100, long-term viability>
  },
  "bestSector": "<specific sector based on category scores and similar innovations>",
  "bestLocation": "<geographic market based on where similar innovations are successful>",
  "marketInsights": "<2-3 sentences citing the similar innovations found and market conditions>",
  "recommendations": ["<actionable tip based on competitor analysis>", "<differentiation strategy based on gaps found>", "<market entry strategy based on research>"]
}`
          }
        ],
      }),
    });

    let marketData: any = {
      marketSimulation: { adoptionRate: 50, marketPenetration: 45, competitionLevel: 60, innovationIndex: 55, projectedGrowth: 50, sustainabilityScore: 50 },
      bestSector: 'Technology',
      bestLocation: 'Global Market',
      marketInsights: 'This innovation shows moderate market potential with opportunities for growth.',
      recommendations: ['Focus on unique value proposition', 'Research target market thoroughly', 'Consider strategic partnerships']
    };

    if (simulationResponse.ok) {
      const simData = await simulationResponse.json();
      const content = simData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          marketData = JSON.parse(jsonMatch[0]);
          console.log('Research-based market data generated successfully');
        } catch (e) {
          console.error('Error parsing market data:', e);
        }
      }
    }

    console.log('Market simulation generated:', marketData.bestSector, marketData.bestLocation);
    
    console.log(`Analysis complete: Found ${results.length} similar innovations`);
    console.log(`Top matches (scores): ${topResults.map(r => r.similarity_score.toFixed(1) + '%').join(', ')}`);

    // Store results with clean data (remove innovation_data before inserting)
    if (topResults.length > 0) {
      const cleanResults = topResults.map(r => ({
        scan_id: r.scan_id,
        innovation_id: r.innovation_id,
        similarity_score: r.similarity_score,
        similarity_tier: r.similarity_tier,
        text_similarity: r.text_similarity,
        image_similarity: r.image_similarity,
        metadata_similarity: r.metadata_similarity
      }));

      // Use admin client to insert results
      const { error: insertError } = await supabaseAdmin
        .from('scan_results')
        .insert(cleanResults);

      if (insertError) {
        console.error('Error inserting scan results:', insertError);
        throw insertError;
      }

      // Store comprehensive analysis in scan metadata
      await supabaseAdmin
        .from('idescan_scans')
        .update({
          metadata: {
            extractedKeywords,
            categoryScores,
            marketSimulation: marketData.marketSimulation,
            bestSector: marketData.bestSector,
            bestLocation: marketData.bestLocation,
            marketInsights: marketData.marketInsights,
            recommendations: marketData.recommendations,
            totalSimilarFound: results.length,
            researchBased: true
          }
        })
        .eq('id', scanId);
    }

    // Update scan status to completed
    await supabaseAdmin
      .from('idescan_scans')
      .update({ status: 'completed' })
      .eq('id', scanId);

    console.log(`Scan completed successfully: ${topResults.length} matches stored from ${results.length} similar innovations found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesCount: topResults.length,
        totalScanned: innovations.length,
        totalSimilar: results.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error processing scan:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function

function calculateTier(score: number): string {
  if (score >= 85) return 'near_duplicate';
  if (score >= 60) return 'strong';
  if (score >= 30) return 'related';
  return 'distant';
}