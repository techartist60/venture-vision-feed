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

    const payload = await req.json();
    console.log('Intasend webhook received:', JSON.stringify(payload));

    const { invoice_id, state, api_ref } = payload;

    if (!api_ref) {
      console.log('No api_ref in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'No reference to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the subscription by payment reference
    const { data: subscription, error: fetchError } = await supabaseClient
      .from('premium_subscriptions')
      .select('*')
      .eq('payment_reference', api_ref)
      .single();

    if (fetchError || !subscription) {
      console.error('Subscription not found for reference:', api_ref);
      return new Response(
        JSON.stringify({ success: false, error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update based on payment state
    if (state === 'COMPLETE' || state === 'PROCESSING') {
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription

      // Generate API key for WebScan premium
      let apiKey = subscription.api_key;
      if (subscription.plan_type === 'webscan_premium' && !apiKey) {
        apiKey = `ws_${crypto.randomUUID().replace(/-/g, '')}`;
      }

      const { error: updateError } = await supabaseClient
        .from('premium_subscriptions')
        .update({
          status: 'active',
          intasend_invoice_id: invoice_id,
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          api_key: apiKey,
        })
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        throw new Error('Failed to update subscription');
      }

      console.log('Subscription activated successfully:', subscription.id);
    } else if (state === 'FAILED' || state === 'CANCELLED') {
      await supabaseClient
        .from('premium_subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', subscription.id);

      console.log('Subscription cancelled:', subscription.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in intasend-webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
