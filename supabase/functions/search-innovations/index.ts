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

    const { ideaDescription, scanId } = await req.json();
    console.log('Searching for innovations matching:', ideaDescription.substring(0, 100));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use AI to generate targeted search queries
    const searchQueriesResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a search query expert. Generate 5 diverse search queries to find similar innovations, patents, startups, and products. Return ONLY the queries, one per line, no numbering or extra text.'
          },
          {
            role: 'user',
            content: `Generate 5 search queries to find innovations similar to: ${ideaDescription}`
          }
        ],
        max_tokens: 200,
      }),
    });

    const searchData = await searchQueriesResponse.json();
    const queries = searchData.choices[0].message.content.trim().split('\n').filter((q: string) => q.trim());
    
    console.log('Generated search queries:', queries);

    const allInnovations: any[] = [];
    const seenUrls = new Set<string>();

    // Search for each query
    for (const query of queries.slice(0, 3)) { // Limit to 3 queries to avoid rate limits
      try {
        const searchResponse = await fetch('https://api.search.brave.com/res/v1/web/search', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': Deno.env.get('BRAVE_SEARCH_API_KEY') || '',
          },
        });

        // Fallback to simple approach if Brave Search not available
        if (!searchResponse.ok || !Deno.env.get('BRAVE_SEARCH_API_KEY')) {
          console.log('Using fallback search approach');
          // Use Google News and TechCrunch as fallback
          await indexNewsFromRSS(supabaseClient, query);
          continue;
        }

        const searchResults = await searchResponse.json();
        
        for (const result of (searchResults.web?.results || []).slice(0, 5)) {
          if (seenUrls.has(result.url)) continue;
          seenUrls.add(result.url);

          const innovation = {
            title: result.title.substring(0, 200),
            description: result.description?.substring(0, 800) || result.title,
            owner: extractDomain(result.url),
            country: 'Unknown',
            source_type: classifySource(result.url, result.title),
            source_url: result.url,
            publication_date: new Date().toISOString().split('T')[0],
            tags: extractKeywords(result.description || result.title),
            metadata: {
              search_query: query,
              relevance_score: result.page_age ? 100 - result.page_age : 50
            }
          };

          allInnovations.push(innovation);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    // Also fetch recent news
    await indexNewsFromRSS(supabaseClient, ideaDescription);

    console.log(`Found ${allInnovations.length} real innovations from web search`);

    // Store innovations in database
    for (const innovation of allInnovations) {
      try {
        // Check for duplicates
        const { data: existing } = await supabaseClient
          .from('innovation_records')
          .select('id')
          .eq('source_url', innovation.source_url)
          .single();

        if (!existing) {
          const embedding = generateSimpleEmbedding(
            `${innovation.title} ${innovation.description} ${innovation.tags.join(' ')}`
          );

          await supabaseClient
            .from('innovation_records')
            .insert({
              ...innovation,
              text_embedding: embedding,
            });
        }
      } catch (error) {
        console.error('Error storing innovation:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: allInnovations.length,
        message: `Found ${allInnovations.length} real innovations`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error searching innovations:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}

function classifySource(url: string, title: string): string {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  if (urlLower.includes('patent') || titleLower.includes('patent')) return 'patent';
  if (urlLower.includes('crunchbase') || urlLower.includes('startup') || titleLower.includes('startup')) return 'startup';
  if (urlLower.includes('techcrunch') || urlLower.includes('news') || urlLower.includes('blog')) return 'news';
  if (urlLower.includes('product') || titleLower.includes('product')) return 'product';
  
  return 'news';
}

function extractKeywords(text: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));
  
  return [...new Set(words)].slice(0, 10);
}

async function indexNewsFromRSS(supabase: any, searchTerm: string): Promise<void> {
  console.log('Fetching news articles related to:', searchTerm);
  
  try {
    // Fetch Google News RSS
    const keywords = searchTerm.toLowerCase().split(/\s+/).slice(0, 3).join('+');
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}+innovation+technology&hl=en-US&gl=US&ceid=US:en`;
    
    const response = await fetch(rssUrl);
    const xmlText = await response.text();
    
    const articles = parseGoogleNewsRSS(xmlText);
    
    for (const article of articles.slice(0, 10)) {
      const { data: existing } = await supabase
        .from('innovation_records')
        .select('id')
        .eq('source_url', article.link)
        .single();

      if (!existing) {
        const embedding = generateSimpleEmbedding(
          `${article.title} ${article.description}`
        );

        await supabase
          .from('innovation_records')
          .insert({
            title: article.title,
            description: article.description,
            owner: article.source,
            country: 'Unknown',
            source_type: 'news',
            source_url: article.link,
            publication_date: article.pubDate,
            tags: extractKeywords(article.description),
            text_embedding: embedding,
          });
      }
    }
  } catch (error) {
    console.error('Error fetching news:', error);
  }
}

function parseGoogleNewsRSS(xmlText: string): any[] {
  const articles: any[] = [];
  
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const items = xmlText.match(itemRegex) || [];
  
  for (const item of items.slice(0, 20)) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
    const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || 
                      item.match(/<description>(.*?)<\/description>/);
    
    if (titleMatch && linkMatch) {
      const title = titleMatch[1];
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').substring(0, 800) : title;
      
      articles.push({
        title: title.substring(0, 200),
        link: linkMatch[1],
        pubDate: pubDateMatch ? new Date(pubDateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        source: sourceMatch ? sourceMatch[1] : 'News Source',
        description: description
      });
    }
  }
  
  return articles;
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
