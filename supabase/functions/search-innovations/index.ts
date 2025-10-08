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

    // Use AI to generate targeted search queries - focus on finding real innovations
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
            content: 'You are an expert at finding similar innovations. Generate 6 specific search queries that will find: patents, startup companies, products, and news articles about similar innovations. Focus on: 1) Specific technical terms, 2) Company/product names, 3) Patent keywords, 4) Industry terms, 5) News-worthy angles, 6) Similar use cases. Return ONLY the queries, one per line.'
          },
          {
            role: 'user',
            content: `Generate 6 targeted search queries to find real-world innovations, patents, startups, or products similar to: ${ideaDescription}`
          }
        ],
        max_tokens: 300,
      }),
    });

    const searchData = await searchQueriesResponse.json();
    const queries = searchData.choices[0].message.content.trim().split('\n').filter((q: string) => q.trim());
    
    console.log('Generated search queries:', queries);

    const allInnovations: any[] = [];
    const seenUrls = new Set<string>();

    // Search multiple sources for each query
    for (const query of queries) {
      try {
        // Always use multiple RSS/news sources for better coverage
        console.log(`Fetching news articles for: "${query.substring(0, 60)}..."`);
        await indexNewsFromRSS(supabaseClient, query, seenUrls, allInnovations);
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
      }
    }

    console.log(`Found ${allInnovations.length} real innovations from web search`);

    // Store innovations in database
    let storedCount = 0;
    for (const innovation of allInnovations) {
      try {
        // Check for duplicates
        const { data: existing } = await supabaseClient
          .from('innovation_records')
          .select('id')
          .eq('source_url', innovation.source_url)
          .maybeSingle();

        if (!existing) {
          const embedding = generateSimpleEmbedding(
            `${innovation.title} ${innovation.description} ${innovation.tags.join(' ')}`
          );

          const { error: insertError } = await supabaseClient
            .from('innovation_records')
            .insert({
              ...innovation,
              text_embedding: embedding,
            });
          
          if (!insertError) {
            storedCount++;
          } else {
            console.error('Insert error:', insertError.message);
          }
        }
      } catch (error) {
        console.error('Error storing innovation:', error);
      }
    }

    console.log(`Stored ${storedCount} new innovations in database`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: allInnovations.length,
        stored: storedCount,
        message: `Found ${allInnovations.length} innovations, stored ${storedCount} new ones`
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
  
  // Patent sources
  if (urlLower.includes('patent') || 
      urlLower.includes('uspto.gov') || 
      urlLower.includes('espacenet') ||
      titleLower.includes('patent')) return 'patent';
  
  // Startup/company sources
  if (urlLower.includes('crunchbase') || 
      urlLower.includes('pitchbook') ||
      urlLower.includes('angellist') ||
      urlLower.includes('ycombinator') ||
      urlLower.includes('startup') || 
      titleLower.includes('startup') ||
      titleLower.includes('raises funding') ||
      titleLower.includes('seed round')) return 'startup';
  
  // Product sources
  if (urlLower.includes('producthunt') || 
      urlLower.includes('product') || 
      titleLower.includes('launches') ||
      titleLower.includes('product') ||
      titleLower.includes('app release')) return 'product';
  
  // News sources (default)
  if (urlLower.includes('techcrunch') || 
      urlLower.includes('wired') ||
      urlLower.includes('verge') ||
      urlLower.includes('news') || 
      urlLower.includes('blog') ||
      urlLower.includes('article')) return 'news';
  
  return 'news'; // Default to news
}

function extractKeywords(text: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));
  
  return [...new Set(words)].slice(0, 10);
}

async function indexNewsFromRSS(
  supabase: any, 
  searchTerm: string, 
  seenUrls: Set<string>, 
  allInnovations: any[]
): Promise<void> {
  try {
    // Try multiple search approaches for better coverage
    const searches = [
      // Google News RSS - innovation focused
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}+innovation+technology&hl=en-US&gl=US&ceid=US:en`,
      // Google News RSS - startup focused
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}+startup+company&hl=en-US&gl=US&ceid=US:en`,
      // Google News RSS - patent focused
      `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}+patent+invention&hl=en-US&gl=US&ceid=US:en`,
    ];

    for (const rssUrl of searches) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.log(`RSS fetch failed with status: ${response.status}`);
          continue;
        }
        
        const xmlText = await response.text();
        
        // Check if we got valid XML content
        if (!xmlText || !xmlText.includes('<rss') && !xmlText.includes('<feed')) {
          console.log('Invalid RSS/XML response');
          continue;
        }
        
        const articles = parseGoogleNewsRSS(xmlText);
        
        console.log(`Found ${articles.length} articles from RSS feed`);
        
        if (articles.length === 0) {
          console.log('No articles parsed from XML, XML preview:', xmlText.substring(0, 500));
        }
        
        for (const article of articles.slice(0, 15)) {
          if (seenUrls.has(article.link)) continue;
          seenUrls.add(article.link);

          const innovation = {
            title: article.title,
            description: article.description,
            owner: article.source,
            country: 'Unknown',
            source_type: classifySource(article.link, article.title),
            source_url: article.link,
            publication_date: article.pubDate,
            tags: extractKeywords(article.description),
            metadata: {
              search_query: searchTerm,
              source_feed: 'Google News RSS'
            }
          };

          allInnovations.push(innovation);
        }
        
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (feedError: any) {
        if (feedError.name === 'AbortError') {
          console.error('RSS feed request timed out');
        } else {
          console.error('Error fetching RSS feed:', feedError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in indexNewsFromRSS:', error);
  }
}

function parseGoogleNewsRSS(xmlText: string): any[] {
  const articles: any[] = [];
  
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const items = xmlText.match(itemRegex) || [];
  
  for (const item of items) {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
    const sourceMatch = item.match(/<source.*?>(.*?)<\/source>/);
    const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || 
                      item.match(/<description>(.*?)<\/description>/);
    
    if (titleMatch && linkMatch) {
      let link = linkMatch[1];
      
      // Try to extract actual URL from Google News redirect
      // Google News often wraps URLs like: https://news.google.com/rss/articles/...
      // We want to extract the actual article URL if possible
      const urlMatch = link.match(/url=(https?:\/\/[^&]+)/);
      if (urlMatch) {
        link = decodeURIComponent(urlMatch[1]);
      }
      
      const title = titleMatch[1];
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').substring(0, 800) : title;
      
      // Skip if title or description is too short (likely not a real article)
      if (title.length < 10) continue;
      
      articles.push({
        title: title.substring(0, 200),
        link: link,
        pubDate: pubDateMatch ? new Date(pubDateMatch[1]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        source: sourceMatch ? sourceMatch[1] : extractSourceFromUrl(link),
        description: description
      });
    }
  }
  
  return articles;
}

// Helper to extract source name from URL
function extractSourceFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.replace('www.', '').split('.');
    // Capitalize first part (e.g., 'techcrunch' from 'techcrunch.com')
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'News Source';
  }
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
