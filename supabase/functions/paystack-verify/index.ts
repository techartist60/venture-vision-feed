import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('Paystack secret key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Reference is required');
    }

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return new Response(
        JSON.stringify({
          success: false,
          verified: false,
          message: 'Payment not verified',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { metadata, paid_at } = paystackData.data;
    const planType = metadata?.plan_type;
    const userId = metadata?.user_id;

    // Calculate subscription period
    const startDate = new Date(paid_at || Date.now());
    const endDate = new Date(startDate);
    
    if (planType === 'weekly') {
      endDate.setDate(endDate.getDate() + 7);
    } else if (planType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Update subscription status
    const { error: updateError } = await supabase
      .from('webscan_subscriptions')
      .update({
        status: 'active',
        starts_at: startDate.toISOString(),
        expires_at: endDate.toISOString(),
      })
      .or(`payment_reference.eq.${reference},paystack_reference.eq.${reference}`);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
    }

    // Update user tier
    const { data: existingTier } = await supabase
      .from('user_subscription_tiers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingTier) {
      await supabase
        .from('user_subscription_tiers')
        .update({
          tier: 'pro',
          max_watched_websites: 50,
          scan_frequency: planType === 'monthly' ? 'daily' : 'weekly',
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_subscription_tiers')
        .insert({
          user_id: userId,
          tier: 'pro',
          max_watched_websites: 50,
          scan_frequency: planType === 'monthly' ? 'daily' : 'weekly',
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        data: {
          planType,
          expiresAt: endDate.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
