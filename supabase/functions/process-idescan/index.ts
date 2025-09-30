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

    // Update status to processing
    await supabaseClient
      .from('idescan_scans')
      .update({ status: 'processing' })
      .eq('id', scanId);

    // Generate text embedding using Lovable AI
    const textEmbedding = await generateTextEmbedding(
      `${scan.title} ${scan.description}`
    );

    // Store embedding in scan
    await supabaseClient
      .from('idescan_scans')
      .update({ text_embedding: textEmbedding })
      .eq('id', scanId);

    // Search for similar innovations
    const { data: innovations } = await supabaseClient
      .from('innovation_records')
      .select('*')
      .limit(100);

    const results = [];
    
    for (const innovation of innovations || []) {
      if (!innovation.text_embedding) continue;

      // Calculate cosine similarity
      const textSim = calculateCosineSimilarity(
        textEmbedding,
        innovation.text_embedding
      );

      // Calculate weighted score (text only for now)
      const similarityScore = Math.round(textSim * 100);

      if (similarityScore >= 30) { // Only store relevant matches
        const tier = calculateTier(similarityScore);
        
        results.push({
          scan_id: scanId,
          innovation_id: innovation.id,
          similarity_score: similarityScore,
          similarity_tier: tier,
          text_similarity: similarityScore,
        });
      }
    }

    // Store results
    if (results.length > 0) {
      await supabaseClient
        .from('scan_results')
        .insert(results);
    }

    // Update scan status to completed
    await supabaseClient
      .from('idescan_scans')
      .update({ status: 'completed' })
      .eq('id', scanId);

    console.log(`Scan completed: ${results.length} matches found`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesCount: results.length 
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

async function generateTextEmbedding(text: string): Promise<number[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Embedding API error:', error);
    throw new Error('Failed to generate embedding');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateTier(score: number): string {
  if (score >= 85) return 'near_duplicate';
  if (score >= 60) return 'strong';
  if (score >= 30) return 'related';
  return 'distant';
}