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

    const url = new URL(req.url);
    const stage = url.searchParams.get('stage');
    const minFunding = url.searchParams.get('min_funding');
    const maxFunding = url.searchParams.get('max_funding');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query for investment-ready posts
    let query = supabaseClient
      .from('media_uploads')
      .select(`
        id,
        title,
        description,
        media_url,
        thumbnail_url,
        investment_status,
        funding_amount,
        investment_stage,
        pitch_summary,
        created_at,
        likes_count,
        views_count,
        user_id,
        profiles:user_id (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('investment_status', 'open')
      .order('created_at', { ascending: false });

    // Apply filters
    if (stage) {
      query = query.eq('investment_stage', stage);
    }
    if (minFunding) {
      query = query.gte('funding_amount', parseInt(minFunding));
    }
    if (maxFunding) {
      query = query.lte('funding_amount', parseInt(maxFunding));
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    const { count: totalCount } = await supabaseClient
      .from('media_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('investment_status', 'open');

    console.log(`Investor API: Returned ${posts?.length || 0} investment-ready posts`);

    return new Response(
      JSON.stringify({
        success: true,
        data: posts || [],
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (totalCount || 0)
        },
        filters: {
          stage,
          minFunding: minFunding ? parseInt(minFunding) : null,
          maxFunding: maxFunding ? parseInt(maxFunding) : null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in investor-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
