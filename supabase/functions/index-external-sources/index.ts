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
      case 'all':
        const patents = await indexPatentData(supabaseClient);
        const startups = await indexStartupData(supabaseClient);
        const news = await indexNewsData(supabaseClient);
        indexed = patents + startups + news;
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

    await supabase
      .from('innovation_records')
      .upsert({
        ...patent,
        text_embedding: embedding,
      }, { onConflict: 'patent_number' });
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
  console.log('Fetching innovation news...');
  
  const sampleNews = [
    {
      title: 'Breakthrough in Quantum Computing Achieved',
      description: 'Researchers demonstrate stable quantum bits at room temperature, potentially revolutionizing computing.',
      owner: 'MIT Research Lab',
      country: 'United States',
      source_type: 'news',
      source_url: 'https://techcrunch.com/quantum-breakthrough',
      publication_date: '2024-12-15',
      tags: ['quantum computing', 'research', 'technology', 'breakthrough']
    },
    {
      title: 'New Solar Panel Efficiency Record Set',
      description: 'Next-generation solar cells achieve 47% efficiency, doubling current commercial standards.',
      owner: 'Solar Innovations Lab',
      country: 'Japan',
      source_type: 'news',
      source_url: 'https://venturebeat.com/solar-efficiency-record',
      publication_date: '2024-12-10',
      tags: ['solar energy', 'renewable', 'efficiency', 'clean tech']
    },
    {
      title: 'Autonomous Drone Delivery Network Launched',
      description: 'First fully autonomous drone delivery service begins operations in major metropolitan area.',
      owner: 'SkyDeliver Inc',
      country: 'United Arab Emirates',
      source_type: 'news',
      source_url: 'https://techcrunch.com/drone-delivery-launch',
      publication_date: '2024-12-05',
      tags: ['drones', 'delivery', 'autonomous', 'logistics']
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

  console.log(`Indexed ${sampleNews.length} news items`);
  return sampleNews.length;
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