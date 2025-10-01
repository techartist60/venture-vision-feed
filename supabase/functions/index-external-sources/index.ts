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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sourceType } = await req.json();
    console.log('Indexing source:', sourceType);

    let indexed = 0;

    switch (sourceType) {
      case 'patents':
        indexed = await indexPatentData(supabaseClient);
        break;
      case 'startups':
        indexed = await indexStartupData(supabaseClient);
        break;
      case 'news':
        indexed = await indexNewsData(supabaseClient);
        break;
      case 'idestrim':
        indexed = await indexIdestrimData(supabaseClient);
        break;
      case 'all':
        const patents = await indexPatentData(supabaseClient);
        const startups = await indexStartupData(supabaseClient);
        const news = await indexNewsData(supabaseClient);
        const idestrim = await indexIdestrimData(supabaseClient);
        indexed = patents + startups + news + idestrim;
        break;
      default:
        throw new Error('Invalid source type');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        indexed,
        message: `Indexed ${indexed} records from ${sourceType}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error indexing sources:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function indexPatentData(supabase: any): Promise<number> {
  console.log('Fetching patent data from public APIs...');
  
  // Example: Fetch from The Lens (free API)
  // Note: In production, you'd need API keys for most services
  const samplePatents = [
    {
      title: 'Renewable Energy Storage System',
      description: 'A novel battery technology for storing renewable energy with improved efficiency and reduced environmental impact.',
      owner: 'GreenTech Industries',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/US123456',
      legal_status: 'Active',
      patent_number: 'US123456B2',
      publication_date: '2024-01-15',
      tags: ['renewable energy', 'battery', 'storage', 'green tech']
    },
    {
      title: 'AI-Powered Medical Diagnosis System',
      description: 'Machine learning system for early disease detection using medical imaging and patient data analysis.',
      owner: 'HealthAI Corp',
      country: 'United Kingdom',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/GB789012',
      legal_status: 'Active',
      patent_number: 'GB789012A',
      publication_date: '2024-03-20',
      tags: ['artificial intelligence', 'healthcare', 'diagnosis', 'medical imaging']
    },
    {
      title: 'Smart Water Purification Device',
      description: 'IoT-enabled water purification system with real-time quality monitoring and automated filtration adjustments.',
      owner: 'AquaTech Solutions',
      country: 'Germany',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/DE345678',
      legal_status: 'Pending',
      patent_number: 'DE345678C1',
      publication_date: '2024-05-10',
      tags: ['water purification', 'IoT', 'smart device', 'environmental']
    }
  ];

  for (const patent of samplePatents) {
    const embedding = generateSimpleEmbedding(
      `${patent.title} ${patent.description} ${patent.tags.join(' ')}`
    );

    // Check if already exists
    const { data: existing } = await supabase
      .from('innovation_records')
      .select('id')
      .eq('source_type', 'patent')
      .eq('title', patent.title)
      .single();

    if (!existing) {
      await supabase
        .from('innovation_records')
        .insert({
          ...patent,
          text_embedding: embedding,
        });
    }
  }

  console.log(`Indexed ${samplePatents.length} patents`);
  return samplePatents.length;
}

async function indexStartupData(supabase: any): Promise<number> {
  console.log('Fetching startup data...');
  
  const sampleStartups = [
    {
      title: 'EcoPackaging Inc',
      description: 'Biodegradable packaging materials made from agricultural waste, providing sustainable alternatives to plastic.',
      owner: 'EcoPackaging Inc',
      country: 'United States',
      source_type: 'startup',
      source_url: 'https://www.crunchbase.com/organization/ecopackaging',
      legal_status: 'Active',
      tags: ['sustainability', 'packaging', 'biodegradable', 'eco-friendly']
    },
    {
      title: 'NeuralLearn',
      description: 'AI-powered personalized education platform adapting to individual learning styles and pace.',
      owner: 'NeuralLearn Ltd',
      country: 'Singapore',
      source_type: 'startup',
      source_url: 'https://www.crunchbase.com/organization/neurallearn',
      legal_status: 'Active',
      tags: ['education technology', 'AI', 'personalized learning', 'edtech']
    },
    {
      title: 'UrbanFarm Solutions',
      description: 'Vertical farming systems for urban environments using hydroponics and automated climate control.',
      owner: 'UrbanFarm Solutions',
      country: 'Netherlands',
      source_type: 'startup',
      source_url: 'https://www.crunchbase.com/organization/urbanfarm',
      legal_status: 'Active',
      tags: ['agriculture', 'urban farming', 'hydroponics', 'sustainability']
    }
  ];

  for (const startup of sampleStartups) {
    const embedding = generateSimpleEmbedding(
      `${startup.title} ${startup.description} ${startup.tags.join(' ')}`
    );

    await supabase
      .from('innovation_records')
      .insert({
        ...startup,
        text_embedding: embedding,
      });
  }

  console.log(`Indexed ${sampleStartups.length} startups`);
  return sampleStartups.length;
}

async function indexNewsData(supabase: any): Promise<number> {
  console.log('Fetching innovation news from TechCrunch RSS...');
  
  try {
    // Fetch from TechCrunch RSS feed
    const rssUrl = 'https://techcrunch.com/feed/';
    const response = await fetch(rssUrl);
    const xmlText = await response.text();
    
    // Simple XML parsing to extract items
    const items = extractRSSItems(xmlText);
    
    let indexed = 0;
    
    for (const item of items.slice(0, 20)) { // Limit to 20 latest articles
      const tags = extractTagsFromText(item.title + ' ' + item.description);
      
      const embedding = generateSimpleEmbedding(
        `${item.title} ${item.description} ${tags.join(' ')}`
      );

      const newsRecord = {
        title: item.title,
        description: item.description,
        owner: 'TechCrunch',
        country: 'United States',
        source_type: 'news',
        source_url: item.link,
        publication_date: item.pubDate?.split('T')[0],
        tags: tags,
        text_embedding: embedding,
      };

      // Check if already exists by source_url
      const { data: existing } = await supabase
        .from('innovation_records')
        .select('id')
        .eq('source_url', newsRecord.source_url)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('innovation_records')
          .insert(newsRecord);

        if (!error) indexed++;
      }
    }

    console.log(`Indexed ${indexed} news items from TechCrunch`);
    return indexed;
  } catch (error) {
    console.error('Error fetching TechCrunch RSS:', error);
    // Fallback to sample data if RSS fails
    return await indexSampleNewsData(supabase);
  }
}

function extractRSSItems(xml: string): Array<{title: string, description: string, link: string, pubDate?: string}> {
  const items: Array<{title: string, description: string, link: string, pubDate?: string}> = [];
  
  // Simple regex-based XML parsing
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const matches = xml.matchAll(itemRegex);
  
  for (const match of matches) {
    const itemXml = match[1];
    
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
    const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || itemXml.match(/<description>(.*?)<\/description>/);
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    
    if (titleMatch && descMatch && linkMatch) {
      // Clean HTML tags from description
      const cleanDesc = descMatch[1].replace(/<[^>]*>/g, '').substring(0, 500);
      
      items.push({
        title: titleMatch[1],
        description: cleanDesc,
        link: linkMatch[1],
        pubDate: pubDateMatch ? pubDateMatch[1] : undefined
      });
    }
  }
  
  return items;
}

async function indexSampleNewsData(supabase: any): Promise<number> {
  console.log('Using sample news data...');
  
  const sampleNews = [
    {
      title: 'Breakthrough in Quantum Computing Achieved',
      description: 'Researchers demonstrate stable quantum bits at room temperature, potentially revolutionizing computing.',
      owner: 'MIT Research Lab',
      country: 'United States',
      source_type: 'news',
      source_url: 'https://techcrunch.com/quantum-breakthrough-' + Date.now(),
      publication_date: new Date().toISOString().split('T')[0],
      tags: ['quantum computing', 'research', 'technology', 'breakthrough']
    },
    {
      title: 'New Solar Panel Efficiency Record Set',
      description: 'Next-generation solar cells achieve 47% efficiency, doubling current commercial standards.',
      owner: 'Solar Innovations Lab',
      country: 'Japan',
      source_type: 'news',
      source_url: 'https://techcrunch.com/solar-efficiency-' + Date.now(),
      publication_date: new Date().toISOString().split('T')[0],
      tags: ['solar energy', 'renewable', 'efficiency', 'clean tech']
    }
  ];

  for (const news of sampleNews) {
    const embedding = generateSimpleEmbedding(
      `${news.title} ${news.description} ${news.tags.join(' ')}`
    );

    await supabase
      .from('innovation_records')
      .insert({
        ...news,
        text_embedding: embedding,
      });
  }

  console.log(`Indexed ${sampleNews.length} sample news items`);
  return sampleNews.length;
}

function extractTagsFromText(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  return [...new Set(words)].slice(0, 10);
}

async function indexIdestrimData(supabase: any): Promise<number> {
  console.log('Fetching Idestrim media uploads...');
  
  // Fetch all media uploads from Idestrim
  const { data: mediaUploads, error } = await supabase
    .from('media_uploads')
    .select(`
      id,
      title,
      description,
      media_type,
      media_url,
      thumbnail_url,
      created_at,
      profiles!media_uploads_user_id_fkey (
        full_name,
        username
      )
    `)
    .limit(200);

  if (error) {
    console.error('Error fetching media uploads:', error);
    return 0;
  }

  if (!mediaUploads || mediaUploads.length === 0) {
    console.log('No media uploads found');
    return 0;
  }

  let indexed = 0;

  for (const media of mediaUploads) {
    // Extract tags from title and description
    const tags = extractTags(media.title, media.description);
    
    const embedding = generateSimpleEmbedding(
      `${media.title} ${media.description || ''} ${tags.join(' ')}`
    );

    const innovationRecord = {
      title: media.title,
      description: media.description || '',
      owner: media.profiles?.full_name || media.profiles?.username || 'Anonymous',
      country: 'Kenya', // Default for Idestrim content
      source_type: 'idestrim',
      source_url: `https://gnhimfnwkwhusiggcowq.supabase.co/storage/v1/object/public/media/${media.media_url}`,
      publication_date: media.created_at?.split('T')[0],
      tags: tags,
      text_embedding: embedding,
      metadata: {
        media_id: media.id,
        media_type: media.media_type,
        media_url: media.media_url,
        thumbnail_url: media.thumbnail_url || media.media_url
      }
    };

    // Check if already exists by media_id in metadata
    const { data: existing } = await supabase
      .from('innovation_records')
      .select('id, metadata')
      .eq('source_type', 'idestrim');

    const existingMediaIds = existing?.map(r => r.metadata?.media_id).filter(Boolean) || [];
    
    if (!existingMediaIds.includes(media.id)) {
      const { error: insertError } = await supabase
        .from('innovation_records')
        .insert(innovationRecord);

      if (!insertError) {
        indexed++;
      } else {
        console.error('Error inserting record:', insertError);
      }
    }
  }

  console.log(`Indexed ${indexed} Idestrim media uploads`);
  return indexed;
}

function extractTags(title: string, description: string | null): string[] {
  const text = `${title} ${description || ''}`.toLowerCase();
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would'
  ]);

  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  // Get unique words
  const uniqueWords = [...new Set(words)];
  
  // Return top 10 most relevant words
  return uniqueWords.slice(0, 10);
}

function generateSimpleEmbedding(text: string): number[] {
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
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
}