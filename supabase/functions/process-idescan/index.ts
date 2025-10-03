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

    // Always fetch fresh data from external sources for each scan
    console.log('Fetching fresh data from external sources (Patents, News, Startups)...');
    
    try {
      // Fetch fresh data from all sources
      const indexResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/index-external-sources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ sourceType: 'all' })
      });
      
      if (!indexResponse.ok) {
        console.error('Failed to fetch external sources:', await indexResponse.text());
      } else {
        const indexResult = await indexResponse.json();
        console.log(`Successfully indexed ${indexResult.count || 0} innovations from external sources`);
      }
      
      // Wait for indexing to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (indexError) {
      console.error('Error fetching external sources:', indexError);
    }

    // Get all innovation records from external sources using admin client
    const { data: innovations } = await supabaseAdmin
      .from('innovation_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000); // Increased limit to get more sources

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

    console.log(`Starting AI-powered similarity scan against ${innovations.length} innovations from external sources...`);
    
    // Log source breakdown
    const sourceBreakdown = innovations.reduce((acc: any, inv: any) => {
      acc[inv.source_type] = (acc[inv.source_type] || 0) + 1;
      return acc;
    }, {});
    console.log('Sources being scanned:', JSON.stringify(sourceBreakdown));

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

        // Use AI to calculate semantic similarity
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
                content: 'You are an expert patent and innovation analyst. Compare two innovations and return ONLY a similarity percentage (0-100). Analyze: core problem, solution mechanism, technology stack, market application, unique features, and competitive advantage. Be precise and thorough. Return ONLY the number.'
              },
              {
                role: 'user',
                content: `User's Innovation:\nTitle: ${scan.title}\nDescription: ${scan.description}\n\nExternal Innovation:\nTitle: ${innovation.title}\nDescription: ${innovation.description || 'No description'}\nSource: ${innovation.source_type}\nOwner: ${innovation.owner || 'Unknown'}\n\nCalculate similarity percentage:`
              }
            ],
            max_tokens: 10,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const similarityText = data.choices[0].message.content.trim();
          const similarityScore = parseFloat(similarityText.replace(/[^0-9.]/g, ''));
          
          if (!isNaN(similarityScore) && similarityScore >= 5) {
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

    // Sort by similarity score descending and limit to top 5
    results.sort((a, b) => b.similarity_score - a.similarity_score);
    const top5Results = results.slice(0, 5);

    // Perform clustering on top 5 results
    const clusteredData = performClustering(top5Results);
    
    console.log(`Found top 5 matches from ${results.length} total innovations`);

    // Store top 5 results with clean data (remove innovation_data before inserting)
    if (top5Results.length > 0) {
      const cleanResults = top5Results.map(r => ({
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

    console.log(`Scan completed: ${top5Results.length} top matches found from ${results.length} total`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesCount: top5Results.length,
        totalScanned: results.length
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