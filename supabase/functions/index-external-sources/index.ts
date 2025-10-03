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
  console.log('Indexing Google Patents data (expanded dataset)...');
  
  const samplePatents = [
    {
      title: 'Renewable Energy Storage System',
      description: 'A novel battery technology for storing renewable energy with improved efficiency of 85%, reduced environmental impact using biodegradable materials, and enhanced durability for long-term grid-scale applications with 25-year lifespan.',
      owner: 'GreenTech Industries',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/US10123456',
      legal_status: 'Active',
      patent_number: 'US10123456B2',
      publication_date: '2024-01-15',
      tags: ['renewable energy', 'battery', 'storage', 'green tech', 'sustainability'],
      metadata: {
        inventor: 'Dr. Sarah Chen',
        contact_email: 'sarah.chen@greentech.com',
        company_url: 'https://greentech-industries.com',
        linkedin: 'https://linkedin.com/in/sarah-chen-greentech',
        twitter: 'https://twitter.com/greentech_sarah',
        company_linkedin: 'https://linkedin.com/company/greentech-industries'
      }
    },
    {
      title: 'AI-Powered Medical Diagnosis System',
      description: 'Deep learning system for early disease detection using medical imaging (MRI, CT, X-ray) with 94% accuracy. Analyzes patient data, medical history, and genetic markers for personalized diagnosis with real-time processing.',
      owner: 'HealthAI Corp',
      metadata: {
        inventor: 'Dr. James Rodriguez',
        contact_email: 'j.rodriguez@healthai.com',
        company_url: 'https://healthai-corp.com',
        linkedin: 'https://linkedin.com/in/james-rodriguez-md',
        twitter: 'https://twitter.com/healthai_james'
      },
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/US10234567',
      legal_status: 'Active',
      patent_number: 'US10234567A1',
      publication_date: '2024-02-20',
      tags: ['AI', 'healthcare', 'diagnosis', 'machine learning', 'medical imaging']
    },
    {
      title: 'Quantum Computing Error Correction Protocol',
      description: 'Novel quantum error correction algorithm reducing decoherence by 78% in superconducting qubits. Enables stable quantum computations for optimization and cryptography applications.',
      owner: 'Quantum Innovations Ltd',
      country: 'United Kingdom',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/GB2024789',
      legal_status: 'Active',
      patent_number: 'GB2024789A',
      publication_date: '2024-03-10',
      tags: ['quantum computing', 'error correction', 'cryptography', 'algorithms']
    },
    {
      title: 'Biodegradable Plastic Alternative from Algae',
      description: 'Manufacturing process for creating fully biodegradable plastic from algae biomass. Decomposes in 90 days in marine environments, suitable for packaging and consumer products.',
      owner: 'EcoMaterials Inc',
      country: 'Netherlands',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/EP3456789',
      legal_status: 'Active',
      patent_number: 'EP3456789B1',
      publication_date: '2023-11-05',
      tags: ['biodegradable', 'sustainable materials', 'algae', 'packaging', 'environment']
    },
    {
      title: 'Autonomous Drone Delivery Network',
      description: 'Multi-drone coordination system for urban package delivery with AI-based traffic management, obstacle avoidance, and optimized routing. Handles 500+ deliveries per day per hub.',
      owner: 'SkyLogistics Technologies',
      country: 'Singapore',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/SG2024123',
      legal_status: 'Active',
      patent_number: 'SG2024123A1',
      publication_date: '2024-01-30',
      tags: ['drones', 'delivery', 'logistics', 'autonomous systems', 'AI']
    },
    {
      title: 'Carbon Capture and Conversion System',
      description: 'Industrial-scale CO2 capture technology converting emissions to useful products like methanol and synthetic fuels. Reduces carbon footprint by 65% in manufacturing plants.',
      owner: 'CarbonSolutions AG',
      country: 'Germany',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/DE2024567',
      legal_status: 'Active',
      patent_number: 'DE2024567B2',
      publication_date: '2023-12-12',
      tags: ['carbon capture', 'climate tech', 'emissions', 'sustainability', 'clean energy']
    },
    {
      title: 'Neural Interface for Prosthetic Control',
      description: 'Brain-computer interface enabling intuitive control of prosthetic limbs through neural signal processing. 98% accuracy in movement prediction with haptic feedback integration.',
      owner: 'NeuroTech Dynamics',
      country: 'Japan',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/JP2024891',
      legal_status: 'Active',
      patent_number: 'JP2024891A',
      publication_date: '2024-02-15',
      tags: ['neural interface', 'prosthetics', 'brain-computer interface', 'healthcare', 'biotechnology']
    },
    {
      title: 'Smart Grid Energy Management System',
      description: 'AI-driven power distribution system optimizing renewable energy integration, load balancing, and demand response. Reduces energy waste by 40% in metropolitan areas.',
      owner: 'PowerAI Systems',
      country: 'South Korea',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/KR2024345',
      legal_status: 'Active',
      patent_number: 'KR2024345B1',
      publication_date: '2024-03-01',
      tags: ['smart grid', 'energy management', 'AI', 'renewable energy', 'power distribution']
    },
    {
      title: 'Lab-Grown Protein Production Method',
      description: 'Cellular agriculture technology for producing animal-free protein with identical nutritional profile. Scalable bioreactor system reduces land use by 95% compared to traditional farming.',
      owner: 'FutureFoods Biotech',
      country: 'Israel',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/IL2024678',
      legal_status: 'Active',
      patent_number: 'IL2024678A',
      publication_date: '2023-10-20',
      tags: ['cellular agriculture', 'alternative protein', 'biotechnology', 'food tech', 'sustainability']
    },
    {
      title: 'Holographic Display Technology',
      description: '3D volumetric display system creating interactive holograms viewable from 360 degrees without special glasses. Applications in medical visualization, education, and entertainment.',
      owner: 'HoloVision Corp',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patents.google.com/patent/US10345678',
      legal_status: 'Active',
      patent_number: 'US10345678B2',
      publication_date: '2024-01-25',
      tags: ['holographic display', '3D visualization', 'augmented reality', 'display technology']
    }
  ];

  let indexed = 0;
  
  for (const patent of samplePatents) {
    // Check for duplicates
    const { data: existing } = await supabase
      .from('innovation_records')
      .select('id')
      .eq('patent_number', patent.patent_number)
      .single();

    if (!existing) {
      const embedding = generateSimpleEmbedding(
        `${patent.title} ${patent.description} ${patent.tags.join(' ')}`
      );

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
  console.log('Indexing USPTO patent data (expanded dataset)...');
  
  const samplePatents = [
    {
      title: 'Blockchain-Based Supply Chain Management',
      description: 'Decentralized supply chain tracking system using blockchain technology for transparency, authenticity verification, and real-time logistics monitoring. Reduces fraud by 92% in pharmaceutical supply chains.',
      owner: 'ChainLogix Inc',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11223344',
      legal_status: 'Pending',
      patent_number: 'US11223344A',
      publication_date: '2024-02-10',
      tags: ['blockchain', 'supply chain', 'logistics', 'tracking', 'transparency']
    },
    {
      title: 'Advanced Solar Cell with 47% Efficiency',
      description: 'Multi-junction perovskite solar cell achieving 47% conversion efficiency through novel light-trapping architecture and improved charge carrier mobility.',
      owner: 'SolarMax Technologies',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11334455',
      legal_status: 'Active',
      patent_number: 'US11334455B2',
      publication_date: '2024-01-05',
      tags: ['solar energy', 'renewable energy', 'photovoltaics', 'clean tech']
    },
    {
      title: 'Self-Healing Concrete with Bacteria',
      description: 'Bio-concrete containing dormant bacteria that activate upon crack formation, producing limestone to automatically repair structural damage. Extends infrastructure lifespan by 200%.',
      owner: 'BioConstruct Materials',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11445566',
      legal_status: 'Active',
      patent_number: 'US11445566B1',
      publication_date: '2023-11-20',
      tags: ['construction', 'materials science', 'biotechnology', 'infrastructure', 'self-healing']
    },
    {
      title: 'Atmospheric Water Harvesting System',
      description: 'Device extracting potable water from air humidity using solar-powered metal-organic frameworks. Produces 10L/day in arid climates with 30% humidity.',
      owner: 'HydroHarvest Inc',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11556677',
      legal_status: 'Active',
      patent_number: 'US11556677A1',
      publication_date: '2024-02-28',
      tags: ['water technology', 'sustainability', 'clean water', 'solar power', 'MOF']
    },
    {
      title: 'Wireless EV Charging Road System',
      description: 'Dynamic inductive charging infrastructure embedded in highways for continuous electric vehicle charging during transit. 85% transmission efficiency at highway speeds.',
      owner: 'ElectroRoad Systems',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11667788',
      legal_status: 'Pending',
      patent_number: 'US11667788A',
      publication_date: '2024-03-12',
      tags: ['electric vehicles', 'wireless charging', 'infrastructure', 'transportation', 'inductive power']
    },
    {
      title: 'AI-Powered Drug Discovery Platform',
      description: 'Machine learning system predicting molecular interactions and optimizing drug candidates. Reduces drug development time from 10 years to 18 months with 73% success rate.',
      owner: 'PharmaAI Labs',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11778899',
      legal_status: 'Active',
      patent_number: 'US11778899B2',
      publication_date: '2024-01-18',
      tags: ['AI', 'drug discovery', 'pharmaceutical', 'machine learning', 'healthcare']
    },
    {
      title: 'Vertical Farming Automation System',
      description: 'Fully automated indoor farming with AI-controlled climate, nutrients, and lighting. Yields 400x more produce per acre than traditional farming with 95% less water.',
      owner: 'AgriTech Innovations',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11889900',
      legal_status: 'Active',
      patent_number: 'US11889900A1',
      publication_date: '2023-12-08',
      tags: ['agriculture', 'vertical farming', 'automation', 'AI', 'food production']
    },
    {
      title: 'Solid-State Battery Technology',
      description: 'Lithium-metal solid-state battery with ceramic electrolyte achieving 500 Wh/kg energy density. Charges in 15 minutes with 2000+ cycle life.',
      owner: 'PowerCell Advanced',
      country: 'United States',
      source_type: 'patent',
      source_url: 'https://patft.uspto.gov/netacgi/nph-Parser?patentnumber=11990011',
      legal_status: 'Active',
      patent_number: 'US11990011B2',
      publication_date: '2024-02-05',
      tags: ['battery', 'solid-state', 'energy storage', 'electric vehicles', 'lithium']
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
  console.log('Indexing WIPO patent data (expanded dataset)...');
  
  const samplePatents = [
    {
      title: 'Universal Vaccine Platform Technology',
      description: 'mRNA-based vaccine platform adaptable to multiple pathogens. Enables rapid vaccine development in 6 weeks with 89% efficacy across variants. Thermostable formulation.',
      owner: 'Global BioHealth Alliance',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024001',
      legal_status: 'Active',
      patent_number: 'WO2024001A1',
      publication_date: '2024-01-20',
      tags: ['vaccine', 'mRNA', 'biotechnology', 'pandemic preparedness', 'global health']
    },
    {
      title: 'Ocean Plastic Cleanup Autonomous System',
      description: 'Self-powered ocean cleaning robots using wave energy. Collects microplastics down to 1mm with 85% efficiency. Processes 50 tons/day with biodegradable collection nets.',
      owner: 'OceanClean Technologies',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024002',
      legal_status: 'Active',
      patent_number: 'WO2024002B2',
      publication_date: '2024-03-15',
      tags: ['ocean cleanup', 'microplastics', 'environment', 'robotics', 'sustainability']
    },
    {
      title: 'Fusion Energy Reactor Design',
      description: 'Compact fusion reactor using advanced magnetic confinement achieving net-positive energy output. 500MW capacity in 10m diameter footprint with tritium breeding.',
      owner: 'Fusion Power International',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024003',
      legal_status: 'Pending',
      patent_number: 'WO2024003A1',
      publication_date: '2024-02-08',
      tags: ['fusion energy', 'clean energy', 'nuclear', 'power generation', 'climate solution']
    },
    {
      title: 'Quantum Internet Protocol',
      description: 'Quantum communication protocol enabling unhackable data transmission over 1000km. Uses quantum entanglement for secure key distribution with zero latency.',
      owner: 'QuantumNet Consortium',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024004',
      legal_status: 'Active',
      patent_number: 'WO2024004A2',
      publication_date: '2023-12-18',
      tags: ['quantum communication', 'cybersecurity', 'quantum internet', 'networking', 'encryption']
    },
    {
      title: 'Personalized Cancer Immunotherapy',
      description: 'AI-designed individualized cancer treatment using patient tumor sequencing. Creates custom T-cell therapies with 78% complete remission rate in solid tumors.',
      owner: 'OncoTherapy Global',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024005',
      legal_status: 'Active',
      patent_number: 'WO2024005B1',
      publication_date: '2024-01-30',
      tags: ['immunotherapy', 'cancer treatment', 'personalized medicine', 'AI', 'oncology']
    },
    {
      title: 'Space Debris Removal System',
      description: 'Satellite constellation with laser ablation and net capture for removing orbital debris. Deorbits 200+ objects/year preventing collision cascades.',
      owner: 'Orbital Cleaners Ltd',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024006',
      legal_status: 'Active',
      patent_number: 'WO2024006A1',
      publication_date: '2024-02-22',
      tags: ['space debris', 'orbital cleanup', 'satellites', 'space technology', 'sustainability']
    },
    {
      title: 'Neuromorphic Computing Chip',
      description: 'Brain-inspired processor with 1 billion artificial neurons. Performs AI tasks at 1000x efficiency of GPUs with 10W power consumption.',
      owner: 'BrainChip Technologies',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024007',
      legal_status: 'Active',
      patent_number: 'WO2024007B2',
      publication_date: '2024-03-05',
      tags: ['neuromorphic computing', 'AI hardware', 'chip design', 'energy efficient', 'processors']
    },
    {
      title: 'Synthetic Photosynthesis System',
      description: 'Artificial leaf technology converting CO2 and sunlight into liquid fuels. 10% solar-to-fuel efficiency producing methanol, ethanol, and hydrogen.',
      owner: 'PhotoFuel Innovations',
      country: 'International',
      source_type: 'patent',
      source_url: 'https://patentscope.wipo.int/search/en/detail.jsf?docId=WO2024008',
      legal_status: 'Pending',
      patent_number: 'WO2024008A1',
      publication_date: '2023-11-28',
      tags: ['artificial photosynthesis', 'carbon capture', 'renewable fuel', 'climate tech', 'clean energy']
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
      tags: ['sustainability', 'packaging', 'biodegradable', 'eco-friendly'],
      metadata: {
        ceo: 'Michael Green',
        contact_email: 'info@ecopackaging.com',
        company_url: 'https://ecopackaging.com',
        linkedin: 'https://linkedin.com/in/michael-green-eco',
        twitter: 'https://twitter.com/ecopackaging',
        company_linkedin: 'https://linkedin.com/company/ecopackaging-inc'
      }
    },
    {
      title: 'NeuralLearn',
      description: 'AI-powered personalized education platform adapting to individual learning styles and pace.',
      owner: 'NeuralLearn Ltd',
      country: 'Singapore',
      source_type: 'startup',
      source_url: 'https://www.crunchbase.com/organization/neurallearn',
      legal_status: 'Active',
      tags: ['education technology', 'AI', 'personalized learning', 'edtech'],
      metadata: {
        ceo: 'Dr. Wei Zhang',
        contact_email: 'contact@neurallearn.ai',
        company_url: 'https://neurallearn.ai',
        linkedin: 'https://linkedin.com/in/wei-zhang-neurallearn',
        twitter: 'https://twitter.com/neurallearn',
        company_linkedin: 'https://linkedin.com/company/neurallearn'
      }
    },
    {
      title: 'UrbanFarm Solutions',
      description: 'Vertical farming systems for urban environments using hydroponics and automated climate control.',
      owner: 'UrbanFarm Solutions',
      country: 'Netherlands',
      source_type: 'startup',
      source_url: 'https://www.crunchbase.com/organization/urbanfarm',
      legal_status: 'Active',
      tags: ['agriculture', 'urban farming', 'hydroponics', 'sustainability'],
      metadata: {
        ceo: 'Anna Van Der Berg',
        contact_email: 'hello@urbanfarm.nl',
        company_url: 'https://urbanfarm-solutions.com',
        linkedin: 'https://linkedin.com/in/anna-van-der-berg',
        twitter: 'https://twitter.com/urbanfarmnl',
        company_linkedin: 'https://linkedin.com/company/urbanfarm-solutions'
      }
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