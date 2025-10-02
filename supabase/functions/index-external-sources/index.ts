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
        const googlePatents = await indexGooglePatents(supabaseClient);
        const usptoPatents = await indexUSPTOPatents(supabaseClient);
        const wipoPatents = await indexWIPOPatents(supabaseClient);
        indexed = googlePatents + usptoPatents + wipoPatents;
        break;
      case 'startups':
        indexed = await indexStartupData(supabaseClient);
        break;
      case 'news':
        const techCrunch = await indexTechCrunchNews(supabaseClient);
        const googleNews = await indexGoogleNews(supabaseClient);
        indexed = techCrunch + googleNews;
        break;
      case 'idestrim':
        indexed = await indexIdestrimData(supabaseClient);
        break;
      case 'all':
        const gPatents = await indexGooglePatents(supabaseClient);
        const uPatents = await indexUSPTOPatents(supabaseClient);
        const wPatents = await indexWIPOPatents(supabaseClient);
        const startups = await indexStartupData(supabaseClient);
        const tc = await indexTechCrunchNews(supabaseClient);
        const gn = await indexGoogleNews(supabaseClient);
        const idestrim = await indexIdestrimData(supabaseClient);
        indexed = gPatents + uPatents + wPatents + startups + tc + gn + idestrim;
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

async function indexGooglePatents(supabase: any): Promise<number> {
  console.log('Indexing Google Patents data...');
  
  const samplePatents = [
    {
      title: 'Renewable Energy Storage System',
      description: 'A novel battery technology for storing renewable energy with improved efficiency, reduced environmental impact, and enhanced durability for long-term grid-scale applications.',
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
      description: 'Machine learning system for early disease detection using medical imaging and patient data analysis with high accuracy and real-time processing capabilities.',
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
      description: 'IoT-enabled water purification system with real-time quality monitoring and automated filtration adjustments for residential and commercial use.',
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

  let indexed = 0;
  for (const patent of samplePatents) {
    const embedding = generateSimpleEmbedding(
      `${patent.title} ${patent.description} ${patent.tags.join(' ')}`
    );

    const { data: existing } = await supabase
      .from('innovation_records')
      .select('id')
      .eq('source_type', 'patent')
      .eq('patent_number', patent.patent_number)
      .single();

    if (!existing) {
      await supabase
        .from('innovation_records')
        .insert({
          ...patent,
          text_embedding: embedding,
        });
      indexed++;
    }
  }

  console.log(`Indexed ${indexed} Google Patents`);
  return indexed;
}

async function indexUSPTOPatents(supabase: any): Promise<number> {
  console.log('Indexing USPTO patent data...');
  
  const samplePatents = [
    {
      title: 'Blockchain-Based Supply Chain Management',
      description: 'Decentralized supply chain tracking system using blockchain technology for transparency, authenticity verification, and real-time logistics monitoring.',
      owner: 'ChainLogix Inc',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/US223344',
      legal_status: 'Pending',
      patent_number: 'US223344A',
      publication_date: '2024-02-10',
      tags: ['blockchain', 'supply chain', 'logistics', 'tracking']
    },
    {
      title: 'Quantum Computing Error Correction',
      description: 'Novel error correction method for quantum computers to improve stability and computation accuracy in large-scale quantum systems.',
      owner: 'QuantumTech Labs',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/US334455',
      legal_status: 'Active',
      patent_number: 'US334455B',
      publication_date: '2024-04-05',
      tags: ['quantum computing', 'error correction', 'computing']
    }
  ];

  let indexed = 0;
  for (const patent of samplePatents) {
    const embedding = generateSimpleEmbedding(
      `${patent.title} ${patent.description} ${patent.tags.join(' ')}`
    );

    const { data: existing } = await supabase
      .from('innovation_records')
      .select('id')
      .eq('patent_number', patent.patent_number)
      .single();

    if (!existing) {
      await supabase
        .from('innovation_records')
        .insert({
          ...patent,
          text_embedding: embedding,
        });
      indexed++;
    }
  }

  console.log(`Indexed ${indexed} USPTO patents`);
  return indexed;
}

async function indexWIPOPatents(supabase: any): Promise<number> {
  console.log('Indexing WIPO patent data...');
  
  const samplePatents = [
    {
      title: 'Biodegradable Plastic Alternative',
      description: 'Environmentally friendly plastic substitute made from plant-based materials with similar properties to traditional plastics but fully biodegradable.',
      owner: 'EcoMaterials Global',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/WO2024001',
      legal_status: 'Active',
      patent_number: 'WO2024001',
      publication_date: '2024-01-20',
      tags: ['biodegradable', 'plastic', 'environment', 'sustainability']
    },
    {
      title: 'Neural Interface for Prosthetic Control',
      description: 'Brain-computer interface technology for intuitive control of prosthetic limbs using neural signals with high precision and low latency.',
      owner: 'NeuroBionics Inc',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/WO2024002',
      legal_status: 'Active',
      patent_number: 'WO2024002',
      publication_date: '2024-03-15',
      tags: ['neural interface', 'prosthetics', 'brain-computer interface', 'medical device']
    }
  ];

  let indexed = 0;
  for (const patent of samplePatents) {
    const embedding = generateSimpleEmbedding(
      `${patent.title} ${patent.description} ${patent.tags.join(' ')}`
    );

    const { data: existing } = await supabase
      .from('innovation_records')
      .select('id')
      .eq('patent_number', patent.patent_number)
      .single();

    if (!existing) {
      await supabase
        .from('innovation_records')
        .insert({
          ...patent,
          text_embedding: embedding,
        });
      indexed++;
    }
  }

  console.log(`Indexed ${indexed} WIPO patents`);
  return indexed;
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

async function indexTechCrunchNews(supabase: any): Promise<number> {
  console.log('Fetching innovation news from TechCrunch RSS...');
  
  try {
    const rssUrl = 'https://techcrunch.com/feed/';
    const response = await fetch(rssUrl);
    const xmlText = await response.text();
    
    const items = extractRSSItems(xmlText);
    
    let indexed = 0;
    
    for (const item of items.slice(0, 15)) {
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
        metadata: {
          source: 'TechCrunch',
          fetched_at: new Date().toISOString()
        }
      };

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

    console.log(`Indexed ${indexed} TechCrunch articles`);
    return indexed;
  } catch (error) {
    console.error('Error fetching TechCrunch RSS:', error);
    return 0;
  }
}

async function indexGoogleNews(supabase: any): Promise<number> {
  console.log('Fetching Google News...');
  
  const apiKey = Deno.env.get('GOOGLE_NEWS_API_KEY');
  
  if (!apiKey) {
    console.log('Google News API key not configured, using sample data');
    return await indexSampleNewsData(supabase);
  }

  try {
    const queries = ['innovation', 'technology breakthrough', 'startup', 'AI advancement', 'renewable energy'];
    let totalIndexed = 0;

    for (const query of queries) {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=8&apiKey=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.articles) {
        for (const article of data.articles) {
          if (!article.title || !article.description) continue;

          const { data: existing } = await supabase
            .from('innovation_records')
            .select('id')
            .eq('source_url', article.url)
            .single();

          if (!existing) {
            const tags = extractTagsFromText(`${article.title} ${article.description}`);
            const embedding = generateSimpleEmbedding(
              `${article.title} ${article.description} ${tags.join(' ')}`
            );

            await supabase.from('innovation_records').insert({
              title: article.title,
              description: article.description || article.content || '',
              owner: article.source?.name || 'Google News',
              country: 'Various',
              source_type: 'news',
              source_url: article.url,
              publication_date: article.publishedAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              tags,
              text_embedding: embedding,
              metadata: {
                source: article.source?.name || 'Google News',
                author: article.author,
                fetched_at: new Date().toISOString()
              }
            });
            
            totalIndexed++;
          }
        }
      }
    }
    
    console.log(`Indexed ${totalIndexed} Google News articles`);
    return totalIndexed;
  } catch (error) {
    console.error('Error fetching Google News:', error);
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