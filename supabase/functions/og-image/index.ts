import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mediaId = url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'idea'; // 'idea' or 'video'

    if (!mediaId) {
      return new Response(
        JSON.stringify({ error: 'Missing media ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch media details
    const { data: media, error } = await supabase
      .from('media_uploads')
      .select(`
        id,
        title,
        description,
        media_type,
        media_url,
        thumbnail_url,
        profiles:user_id (
          full_name,
          username
        )
      `)
      .eq('id', mediaId)
      .single();

    if (error || !media) {
      // Return default OG image if media not found
      return new Response(
        JSON.stringify({
          title: 'Idestrim - Share Your Innovation',
          description: 'Discover and share innovative ideas through videos and photos.',
          image: `${url.origin}/idestrim-og-logo.png`,
          url: `${url.origin}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine the image to use
    let ogImage = '';
    const isVideo = media.media_type === 'video' || media.media_type?.startsWith('video/');
    
    if (media.thumbnail_url) {
      ogImage = media.thumbnail_url;
    } else if (!isVideo && media.media_url) {
      // For images, use the media URL directly
      ogImage = media.media_url;
    } else {
      // Fallback to Idestrim logo
      ogImage = `${url.origin}/idestrim-og-logo.png`;
    }

    // Build OG metadata
    const authorName = media.profiles?.full_name || 'Anonymous';
    const ogTitle = media.title || 'Shared on Idestrim';
    const ogDescription = media.description 
      ? `${media.description.substring(0, 150)}${media.description.length > 150 ? '...' : ''}`
      : `Shared by ${authorName} on Idestrim`;

    const mediaUrl = type === 'video' 
      ? `${url.origin}/video/${media.id}`
      : `${url.origin}/idea/${media.id}`;

    return new Response(
      JSON.stringify({
        title: ogTitle,
        description: ogDescription,
        image: ogImage,
        url: mediaUrl,
        type: isVideo ? 'video.other' : 'article',
        author: authorName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in og-image function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
