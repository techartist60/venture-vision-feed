import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RSS_URL =
  'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en';

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

interface Article {
  title: string;
  link: string;
  source: string;
  description: string;
}

function parseRss(xml: string): Article[] {
  const items = xml.match(/<item>(.*?)<\/item>/gs) || [];
  const articles: Article[] = [];

  for (const item of items) {
    const titleMatch =
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s) || item.match(/<title>(.*?)<\/title>/s);
    const linkMatch = item.match(/<link>(.*?)<\/link>/s);
    const sourceMatch = item.match(/<source[^>]*>(.*?)<\/source>/s);
    const descMatch =
      item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s) ||
      item.match(/<description>(.*?)<\/description>/s);

    if (!titleMatch || !linkMatch) continue;

    const rawTitle = decodeEntities(titleMatch[1]).trim();
    // Google News appends " - Source" to titles
    const title = rawTitle.replace(/\s-\s[^-]+$/, '').trim() || rawTitle;
    const description = descMatch
      ? decodeEntities(descMatch[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';

    if (title.length < 12) continue;

    articles.push({
      title: title.substring(0, 200),
      link: linkMatch[1].trim(),
      source: sourceMatch ? decodeEntities(sourceMatch[1]).trim() : 'Tech News',
      description: description.substring(0, 600),
    });
  }

  return articles;
}

async function resolveArticle(url: string): Promise<{ finalUrl: string; image: string | null; summary: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return { finalUrl: url, image: null, summary: null };

    const html = await res.text();
    const finalUrl = res.url || url;

    const imgMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

    const descMatch =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

    const image = imgMatch && imgMatch[1].startsWith('http') ? decodeEntities(imgMatch[1]) : null;
    const summary = descMatch ? decodeEntities(descMatch[1]).trim() : null;

    return { finalUrl, image, summary };
  } catch (_e) {
    return { finalUrl: url, image: null, summary: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('tech_news_posts')
      .select('id')
      .eq('published_for', today)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, skipped: true, message: 'Already posted today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rssRes = await fetch(RSS_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!rssRes.ok) {
      throw new Error(`RSS fetch failed with status ${rssRes.status}`);
    }

    const articles = parseRss(await rssRes.text());
    console.log(`Parsed ${articles.length} tech articles`);

    if (articles.length === 0) {
      throw new Error('No articles found in feed');
    }

    const { data: recent } = await supabase
      .from('tech_news_posts')
      .select('source_url, title')
      .order('published_for', { ascending: false })
      .limit(30);

    const seenUrls = new Set((recent || []).map((r) => r.source_url));
    const seenTitles = new Set((recent || []).map((r) => r.title.toLowerCase()));

    for (const article of articles.slice(0, 10)) {
      if (seenUrls.has(article.link) || seenTitles.has(article.title.toLowerCase())) continue;

      const { finalUrl, image, summary } = await resolveArticle(article.link);
      if (!image) continue; // require a photo
      if (seenUrls.has(finalUrl)) continue;

      const description = (summary || article.description || '').substring(0, 600);

      const { data: inserted, error } = await supabase
        .from('tech_news_posts')
        .insert({
          title: article.title,
          description,
          image_url: image,
          source_name: article.source,
          source_url: finalUrl,
          published_for: today,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Insert error:', error.message);
        continue;
      }

      console.log('Posted daily tech news:', inserted?.title);
      return new Response(JSON.stringify({ success: true, post: inserted }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: false, message: 'No suitable article with an image was found' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('fetch-tech-news error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
