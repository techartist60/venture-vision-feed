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

    console.log(`Starting AI-powered category analysis and market simulation...`);
    console.log(`User's idea - Title: "${scan.title}", Description length: ${scan.description.length} chars`);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Get category similarity scores
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

    // Step 2: Find market performance insights and similar innovations
    const results = [];
    const innovationsByCategory: any = { tech: [], fashion: [], health: [], agriculture: [], arts: [] };

    // Use AI to calculate similarity for each innovation
    for (const innovation of innovations) {
      try {
        const scanText = `Title: ${scan.title}\nDescription: ${scan.description}`;
        const innovationText = `Title: ${innovation.title}\nDescription: ${innovation.description || 'No description'}`;

        // Use AI to calculate semantic similarity based on user's text input
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
                content: 'You are an expert innovation analyst. Compare two innovations based on their actual similarity in concept, technology, market, and problem-solving approach. Return ONLY a similarity score from 0-100. Scoring guidelines: 90-100 = Nearly identical concept and implementation; 70-89 = Very similar technology solving same problem; 50-69 = Related field with similar approach; 30-49 = Same industry but different approach; 20-29 = Loosely related; 0-19 = Different domains. Be accurate and consider: technical approach, target problem, market application, and innovation type. Return ONLY the numeric score with no explanation.'
              },
              {
                role: 'user',
                content: `Compare these innovations and rate their similarity:

USER'S INNOVATION:
${scan.description}

EXISTING INNOVATION:
Title: ${innovation.title}
Description: ${innovation.description || innovation.title}
Type: ${innovation.source_type}
Owner: ${innovation.owner || 'Unknown'}

Return similarity score (0-100):`
              }
            ],
            max_tokens: 10,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const similarityText = data.choices[0].message.content.trim();
          const similarityScore = parseFloat(similarityText.replace(/[^0-9.]/g, ''));
          
          console.log(`Comparing user idea with "${innovation.title.substring(0, 50)}..." - Score: ${similarityScore}%`);
          
          if (!isNaN(similarityScore) && similarityScore >= 20) {
            const tier = calculateTier(similarityScore);
            
            console.log(`Innovation "${innovation.title.substring(0, 50)}" - AI Similarity: ${similarityScore}%`);
            
            results.push({
              scan_id: scanId,
              innovation_id: innovation.id,
              similarity_score: Math.round(similarityScore * 100) / 100,
              similarity_tier: tier,
              text_similarity: Math.round(similarityScore * 100) / 100,
              image_similarity: null,
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

    // Step 3: Generate market simulation and insights
    console.log('Generating market simulation and insights...');
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
            content: 'You are a market analysis expert. Provide realistic market performance projections and recommendations. Return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: `Analyze this innovation for market potential:

INNOVATION: ${scan.description}

SIMILAR INNOVATIONS FOUND: ${topResults.length}

Return JSON format:
{
  "marketSimulation": {
    "adoptionRate": <0-100>,
    "marketPenetration": <0-100>,
    "competitionLevel": <0-100>,
    "innovationIndex": <0-100>,
    "projectedGrowth": <0-100>,
    "sustainabilityScore": <0-100>
  },
  "bestSector": "<sector name>",
  "bestLocation": "<geographic location>",
  "marketInsights": "<brief 2-3 sentence insight>",
  "recommendations": ["<tip 1>", "<tip 2>", "<tip 3>"]
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
            categoryScores,
            marketSimulation: marketData.marketSimulation,
            bestSector: marketData.bestSector,
            bestLocation: marketData.bestLocation,
            marketInsights: marketData.marketInsights,
            recommendations: marketData.recommendations,
            totalSimilarFound: results.length
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