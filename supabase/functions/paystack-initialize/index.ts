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
  userId: string;
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PaymentRequest = await req.json();
    const { email, amount, planType, scanId, userId, callbackUrl } = body;

    if (!email || !amount || !planType || !userId) {
      throw new Error('Missing required fields: email, amount, planType, userId');
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
