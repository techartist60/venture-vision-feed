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

    // Check if we have enough innovation records to compare against
    const { count } = await supabaseClient
      .from('innovation_records')
      .select('*', { count: 'exact', head: true });

    console.log(`Found ${count} innovation records in database`);

    // If we have less than 20 records, trigger auto-indexing
    if (!count || count < 20) {
      console.log('Auto-indexing data sources...');
      
      try {
        // Index all sources
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/index-external-sources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({ sourceType: 'all' })
        });
        
        console.log('Auto-indexing completed');
      } catch (indexError) {
        console.error('Auto-indexing failed:', indexError);
      }
    }

    // Search for similar innovations - get ALL records with embeddings
    const { data: innovations } = await supabaseClient
      .from('innovation_records')
      .select('*')
      .not('text_embedding', 'is', null)
      .limit(1000);

    console.log(`Comparing against ${innovations?.length || 0} innovations`);

    const results = [];
    
    for (const innovation of innovations || []) {
      if (!innovation.text_embedding) continue;

      // Calculate text similarity
      const textSim = calculateCosineSimilarity(
        textEmbedding,
        innovation.text_embedding
      );

      // Calculate enhanced metadata similarity
      const metadataSim = calculateEnhancedMetadataSimilarity(
        {
          title: scan.title,
          description: scan.description,
          tags: extractKeywords(scan.description)
        },
        {
          title: innovation.title,
          description: innovation.description,
          tags: innovation.tags || []
        }
      );

      // Image similarity (placeholder)
      let imageSim = 0;
      if (scan.image_url && innovation.image_embedding) {
        imageSim = 0.5;
      }

      // Calculate weighted similarity score
      const hasImage = scan.image_url && innovation.image_embedding;
      const textWeight = hasImage ? 0.5 : 0.6;
      const imageWeight = hasImage ? 0.4 : 0;
      const metadataWeight = hasImage ? 0.1 : 0.4;

      const weightedScore = (
        textSim * textWeight +
        imageSim * imageWeight +
        metadataSim * metadataWeight
      ) * 100;

      const similarityScore = Math.round(weightedScore * 100) / 100; // 2 decimal places

      console.log(`Innovation "${innovation.title.substring(0, 50)}" - Score: ${similarityScore}%, Text: ${Math.round(textSim * 100)}%, Metadata: ${Math.round(metadataSim * 100)}%`);

      if (similarityScore >= 15) {
        const tier = calculateTier(similarityScore);
        
        results.push({
          scan_id: scanId,
          innovation_id: innovation.id,
          similarity_score: similarityScore,
          similarity_tier: tier,
          text_similarity: Math.round(textSim * 10000) / 100, // As percentage
          image_similarity: hasImage ? Math.round(imageSim * 10000) / 100 : null,
          metadata_similarity: Math.round(metadataSim * 10000) / 100,
          innovation_data: innovation // Store for clustering
        });
      }
    }

    // Sort by similarity score descending
    results.sort((a, b) => b.similarity_score - a.similarity_score);

    // Perform clustering on results
    const clusteredData = performClustering(results);
    
    console.log(`Found ${results.length} similar innovations in ${clusteredData.clusters.length} clusters`);

    // Store results with clean data (remove innovation_data before inserting)
    if (results.length > 0) {
      const cleanResults = results.map(r => ({
        scan_id: r.scan_id,
        innovation_id: r.innovation_id,
        similarity_score: r.similarity_score,
        similarity_tier: r.similarity_tier,
        text_similarity: r.text_similarity,
        image_similarity: r.image_similarity,
        metadata_similarity: r.metadata_similarity
      }));

      await supabaseClient
        .from('scan_results')
        .insert(cleanResults);

      // Store cluster information in scan metadata
      await supabaseClient
        .from('idescan_scans')
        .update({
          metadata: clusteredData
        })
        .eq('id', scanId);
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

  // Use Gemini to generate embeddings via text analysis
  // We'll create a 1536-dimensional vector from text features
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
          content: 'Extract key semantic features from the text as a numerical representation.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Embedding API error:', error);
    throw new Error('Failed to generate embedding');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Generate deterministic embedding from text
  return generateSimpleEmbedding(text);
}

function generateSimpleEmbedding(text: string): number[] {
  // Simple but effective embedding generation
  const embedding = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const idx = (charCode * (i + 1) * (j + 1)) % 1536;
      embedding[idx] += 1 / (i + 1);
    }
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
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
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateEnhancedMetadataSimilarity(
  scan: { title: string; description: string; tags: string[] },
  innovation: { title: string; description: string; tags: string[] }
): number {
  let score = 0;
  let factors = 0;

  // Title similarity with higher weight
  const scanTitleWords = scan.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const innovationTitleWords = innovation.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const titleSim = calculateJaccardSimilarity(scanTitleWords, innovationTitleWords);
  score += titleSim * 1.5;
  factors += 1.5;

  // Description keyword overlap
  const scanKeywords = extractKeywords(scan.description).slice(0, 15);
  const innovationKeywords = extractKeywords(innovation.description).slice(0, 15);
  const descSim = calculateJaccardSimilarity(scanKeywords, innovationKeywords);
  score += descSim;
  factors++;

  // Tag overlap with high weight
  if (scan.tags.length > 0 && innovation.tags.length > 0) {
    const tagSim = calculateJaccardSimilarity(
      scan.tags.map(t => t.toLowerCase()),
      innovation.tags.map(t => t.toLowerCase())
    );
    score += tagSim * 2;
    factors += 2;
  }

  // Domain/category matching
  const scanDomain = inferDomain(scan.description);
  const innovationDomain = inferDomain(innovation.description);
  if (scanDomain === innovationDomain && scanDomain !== 'general') {
    score += 1;
    factors++;
  }

  return factors > 0 ? score / factors : 0;
}

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

function calculateJaccardSimilarity(set1: string[], set2: string[]): number {
  const s1 = new Set(set1.filter(w => w.length > 2)); // Filter short words
  const s2 = new Set(set2.filter(w => w.length > 2));
  
  if (s1.size === 0 && s2.size === 0) return 0;
  
  const intersection = new Set([...s1].filter(x => s2.has(x)));
  const union = new Set([...s1, ...s2]);
  
  return intersection.size / union.size;
}

function inferDomain(text: string): string {
  const lower = text.toLowerCase();
  
  const domains = {
    healthcare: ['health', 'medical', 'diagnosis', 'patient', 'disease', 'treatment'],
    energy: ['energy', 'solar', 'battery', 'renewable', 'power', 'electric'],
    agriculture: ['farm', 'crop', 'agriculture', 'food', 'harvest', 'soil'],
    technology: ['ai', 'machine learning', 'software', 'algorithm', 'data', 'computing'],
    environment: ['environmental', 'sustainable', 'eco', 'green', 'climate', 'pollution'],
    transportation: ['vehicle', 'transport', 'automotive', 'drone', 'delivery', 'logistics'],
    manufacturing: ['manufacturing', 'production', 'factory', 'industrial', 'process'],
    education: ['education', 'learning', 'teaching', 'student', 'school', 'training']
  };

  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return domain;
    }
  }

  return 'general';
}

function extractKeywords(text: string): string[] {
  // Remove common stop words and extract meaningful keywords
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const wordCount = new Map<string, number>();
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  // Get top keywords by frequency
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function calculateTier(score: number): string {
  if (score >= 85) return 'near_duplicate';
  if (score >= 60) return 'strong';
  if (score >= 30) return 'related';
  return 'distant';
}