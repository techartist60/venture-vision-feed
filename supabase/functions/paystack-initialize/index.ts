import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  email: string;
  amount: number; // In KES (50 for weekly, 150 for monthly)
  planType: 'weekly' | 'monthly';
  scanId?: string;
  callbackUrl: string;
}

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PaymentRequest = await req.json();
    const { email, amount, planType, scanId, callbackUrl } = body;

    if (!email || !amount || !planType || !callbackUrl) {
      throw new Error('Missing required fields: email, amount, planType, callbackUrl');
    }

    // Validate callbackUrl is a same-origin URL of the app
    try {
      const cbUrl = new URL(callbackUrl);
      const allowedHosts = [
        'idestrim.lovable.app',
        'venture-vision-feed.lovable.app',
        'id-preview--4f0386d7-d469-4e7b-b62e-18a4474b5bd6.lovable.app',
      ];
      const isAllowed =
        allowedHosts.includes(cbUrl.hostname) ||
        cbUrl.hostname.endsWith('.lovable.app') ||
        cbUrl.hostname.endsWith('.lovableproject.com');
      if (!isAllowed) {
        throw new Error('Invalid callback URL');
      }
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid callback URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate plan and amount
    const validPlans: Record<string, number> = {
      weekly: 50,
      monthly: 150,
    };

    if (!validPlans[planType] || validPlans[planType] !== amount) {
      throw new Error('Invalid plan type or amount');
    }

    // Generate unique reference
    const reference = `WEBSCAN_${planType.toUpperCase()}_${userId.substring(0, 8)}_${Date.now()}`;

    // Create subscription record with pending status
    const { error: insertError } = await supabase
      .from('webscan_subscriptions')
      .insert({
        user_id: userId,
        scan_id: scanId || null,
        plan_type: planType,
        amount: amount,
        currency: 'KES',
        payment_reference: reference,
        status: 'pending',
      });

    if (insertError) {
      console.error('Failed to create subscription record:', insertError);
      throw new Error('Failed to create subscription record');
    }

    // Initialize Paystack transaction
    // Paystack expects amount in the smallest currency unit (kobo for NGN, cents for KES)
    const paystackAmount = amount * 100;

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: paystackAmount,
        currency: 'KES',
        reference,
        callback_url: callbackUrl,
        metadata: {
          plan_type: planType,
          user_id: userId,
          scan_id: scanId,
          custom_fields: [
            {
              display_name: "Plan Type",
              variable_name: "plan_type",
              value: planType === 'weekly' ? 'Weekly (50 KES)' : 'Monthly (150 KES)',
            },
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    // Update subscription with Paystack reference
    await supabase
      .from('webscan_subscriptions')
      .update({ paystack_reference: paystackData.data.reference })
      .eq('payment_reference', reference);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
          reference: paystackData.data.reference,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment initialization error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
