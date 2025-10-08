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
    const { innovationId, scanId, email } = await req.json();
    
    if (!innovationId || !email) {
      throw new Error('Innovation ID and email are required');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if already unlocked
    const { data: existingUnlock } = await supabaseClient
      .from('unlocked_innovations')
      .select('id')
      .eq('user_id', user.id)
      .eq('innovation_id', innovationId)
      .single();

    if (existingUnlock) {
      return new Response(
        JSON.stringify({ error: 'Already unlocked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Paystack payment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const reference = `unlock_${innovationId}_${user.id}_${Date.now()}`;

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: 500, // 5 KSH in kobo (Paystack uses kobo)
        reference,
        metadata: {
          user_id: user.id,
          innovation_id: innovationId,
          scan_id: scanId,
        },
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paystack-webhook`,
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack error:', paystackData);
      throw new Error(paystackData.message || 'Payment initialization failed');
    }

    console.log('Payment initialized:', { reference, user_id: user.id, innovation_id: innovationId });

    return new Response(
      JSON.stringify({
        authorizationUrl: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in paystack-initialize:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
