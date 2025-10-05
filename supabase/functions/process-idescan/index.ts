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

    console.log(`Starting AI-powered semantic similarity scan of user's idea against ${innovations.length} innovations...`);
    console.log(`User's idea - Title: "${scan.title}", Description length: ${scan.description.length} chars`);
    
    // Log source breakdown
    const sourceBreakdown = innovations.reduce((acc: any, inv: any) => {
      acc[inv.source_type] = (acc[inv.source_type] || 0) + 1;
      return acc;
    }, {});
    console.log('Comparing against sources:', JSON.stringify(sourceBreakdown));

    const results = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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

    // Sort by similarity score descending and limit to top 10 (increased from 5)
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    const top10Results = results.slice(0, 10);

    // Perform clustering on top 10 results
    const clusteredData = performClustering(top10Results);
    
    console.log(`Semantic scan complete: Found ${results.length} similar innovations based on text analysis`);
    console.log(`Top 10 matches (scores): ${top10Results.map(r => r.similarity_score.toFixed(1) + '%').join(', ')}`);

    // Store top 10 results with clean data (remove innovation_data before inserting)
    if (top10Results.length > 0) {
      const cleanResults = top10Results.map(r => ({
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

      // Store cluster information in scan metadata
      await supabaseAdmin
        .from('idescan_scans')
        .update({
          metadata: clusteredData
        })
        .eq('id', scanId);
    }

    // Update scan status to completed
    await supabaseAdmin
      .from('idescan_scans')
      .update({ status: 'completed' })
      .eq('id', scanId);

    console.log(`Scan completed successfully: ${top10Results.length} matches stored from ${results.length} similar innovations found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesCount: top10Results.length,
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

// Helper functions for clustering and analysis

function performClustering(results: any[]): any {
  if (results.length === 0) return { clusters: [], summary: {} };

  const clusters: any[] = [];
  const used = new Set<number>();

  // Group by similarity score ranges and related themes
  for (let i = 0; i < results.length; i++) {
    if (used.has(i)) continue;

    const cluster: any = {
      id: clusters.length + 1,
      lead_innovation: {
        title: results[i].innovation_data.title,
        source_type: results[i].innovation_data.source_type,
        similarity_score: results[i].similarity_score
      },
      members: [results[i]],
      avg_similarity: results[i].similarity_score,
      tier: results[i].similarity_tier,
      size: 1
    };

    used.add(i);

    // Find similar innovations to cluster (within 10% score and same tier)
    for (let j = i + 1; j < results.length; j++) {
      if (used.has(j)) continue;

      const scoreDiff = Math.abs(results[i].similarity_score - results[j].similarity_score);
      if (scoreDiff <= 10 && results[i].similarity_tier === results[j].similarity_tier) {
        cluster.members.push(results[j]);
        cluster.size++;
        cluster.avg_similarity = cluster.members.reduce((sum: number, m: any) => 
          sum + m.similarity_score, 0) / cluster.members.length;
        used.add(j);
      }
    }

    clusters.push(cluster);
  }

  // Generate summary statistics
  const summary = {
    total_matches: results.length,
    cluster_count: clusters.length,
    highest_similarity: results[0]?.similarity_score || 0,
    avg_cluster_size: results.length / clusters.length,
    tier_distribution: results.reduce((acc: any, r: any) => {
      acc[r.similarity_tier] = (acc[r.similarity_tier] || 0) + 1;
      return acc;
    }, {})
  };

  return { clusters, summary };
}

function calculateTier(score: number): string {
  if (score >= 85) return 'near_duplicate';
  if (score >= 60) return 'strong';
  if (score >= 30) return 'related';
  return 'distant';
}