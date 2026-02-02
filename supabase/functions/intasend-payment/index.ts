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

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const { action, planType } = await req.json();

    if (action === 'create_payment') {
      // Create Intasend checkout
      const intasendSecretKey = Deno.env.get('INTASEND_SECRET_KEY');
      const intasendPublishableKey = Deno.env.get('INTASEND_PUBLISHABLE_KEY');

      if (!intasendSecretKey) {
        console.error('INTASEND_SECRET_KEY not configured');
        return new Response(
          JSON.stringify({ 
            error: 'Payment gateway not configured', 
            details: 'INTASEND_SECRET_KEY is missing. Please add it in Supabase Dashboard > Edge Functions > Secrets'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!intasendPublishableKey) {
        console.error('INTASEND_PUBLISHABLE_KEY not configured');
        return new Response(
          JSON.stringify({ 
            error: 'Payment gateway not configured', 
            details: 'INTASEND_PUBLISHABLE_KEY is missing. Please add it in Supabase Dashboard > Edge Functions > Secrets'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate key format (Intasend keys typically start with ISSecretKey_ or ISPubKey_)
      if (!intasendSecretKey.startsWith('ISSecretKey_') && !intasendSecretKey.startsWith('test_') && intasendSecretKey.length < 20) {
        console.error('INTASEND_SECRET_KEY appears invalid');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid API key format', 
            details: 'The INTASEND_SECRET_KEY does not appear to be valid. Please check your Intasend dashboard for the correct key.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const amount = 10.00; // $10 USD
      const currency = 'USD';
      const reference = `${planType}_${userId}_${Date.now()}`;

      // Create subscription record first
      const { data: subscription, error: subError } = await supabaseClient
        .from('premium_subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          amount: amount,
          currency: currency,
          payment_reference: reference,
          status: 'pending'
        })
        .select()
        .single();

      if (subError) {
        console.error('Error creating subscription:', subError);
        throw new Error('Failed to create subscription record');
      }

      // Create Intasend checkout session with retry and better error handling
      const PAYMENT_TIMEOUT = 30000; // 30 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PAYMENT_TIMEOUT);

      let intasendResponse;
      try {
        intasendResponse = await fetch('https://payment.intasend.com/api/v1/checkout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${intasendSecretKey}`,
          },
          body: JSON.stringify({
            public_key: intasendPublishableKey,
            amount: amount,
            currency: currency,
            email: userEmail,
            first_name: userData.user.user_metadata?.full_name?.split(' ')[0] || 'User',
            last_name: userData.user.user_metadata?.full_name?.split(' ')[1] || '',
            api_ref: reference,
            redirect_url: `${req.headers.get('origin')}/premium/callback?ref=${reference}&plan=${planType}`,
            webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/intasend-webhook`,
          }),
          signal: controller.signal,
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Network error calling Intasend:', fetchError);
        return new Response(
          JSON.stringify({ 
            error: 'Payment gateway unavailable', 
            details: 'Could not connect to Intasend. Please try again later.'
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      clearTimeout(timeoutId);

      // Check content type before parsing
      const contentType = intasendResponse.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const textResponse = await intasendResponse.text();
        console.error('Intasend returned non-JSON response:', textResponse.substring(0, 500));
        return new Response(
          JSON.stringify({ 
            error: 'Payment gateway error', 
            details: 'Intasend returned an unexpected response. Please try again.'
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let checkoutData;
      try {
        checkoutData = await intasendResponse.json();
      } catch (parseError) {
        console.error('Failed to parse Intasend response:', parseError);
        return new Response(
          JSON.stringify({ 
            error: 'Payment gateway error', 
            details: 'Failed to parse Intasend response.'
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!intasendResponse.ok) {
        console.error('Intasend API error:', JSON.stringify(checkoutData));
        
        // Handle specific error types
        const errorDetail = checkoutData.errors?.[0]?.detail || checkoutData.message || 'Unknown error';
        const errorCode = checkoutData.errors?.[0]?.code || 'unknown';
        
        if (errorCode === 'authentication_failed') {
          return new Response(
            JSON.stringify({ 
              error: 'API key authentication failed', 
              details: 'The Intasend API keys may be expired or invalid. Please update your keys in Supabase secrets.'
            }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Payment initialization failed', 
            details: errorDetail
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update subscription with invoice ID
      await supabaseClient
        .from('premium_subscriptions')
        .update({ intasend_invoice_id: checkoutData.id })
        .eq('id', subscription.id);

      return new Response(
        JSON.stringify({
          success: true,
          checkoutUrl: checkoutData.url,
          invoiceId: checkoutData.id,
          reference: reference,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_payment') {
      const { reference } = await req.json();

      const { data: subscription } = await supabaseClient
        .from('premium_subscriptions')
        .select('*')
        .eq('payment_reference', reference)
        .eq('user_id', userId)
        .single();

      if (!subscription) {
        return new Response(
          JSON.stringify({ success: false, error: 'Subscription not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: subscription.status,
          subscription: subscription,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_subscription') {
      const { data: subscription } = await supabaseClient
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_type', planType)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          hasActiveSubscription: !!subscription,
          subscription: subscription,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_api_key') {
      // Generate a unique API key for WebScan integration
      const apiKey = `ws_${crypto.randomUUID().replace(/-/g, '')}`;

      // Update the subscription with the API key
      const { data: subscription, error } = await supabaseClient
        .from('premium_subscriptions')
        .update({ api_key: apiKey })
        .eq('user_id', userId)
        .eq('plan_type', 'webscan_premium')
        .eq('status', 'active')
        .select()
        .single();

      if (error) {
        throw new Error('Failed to generate API key');
      }

      return new Response(
        JSON.stringify({
          success: true,
          apiKey: apiKey,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in intasend-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
