import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    // Verify webhook signature
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const messageData = encoder.encode(body);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== computedSignature) {
      console.error('Invalid signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(body);
    
    console.log('Webhook received:', payload.event);

    if (payload.event === 'charge.success') {
      const { reference, metadata, amount } = payload.data;
      const { user_id, innovation_id, scan_id } = metadata;

      console.log('Processing payment:', { reference, user_id, innovation_id });

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Record the unlocked innovation
      const { error: insertError } = await supabaseClient
        .from('unlocked_innovations')
        .insert({
          user_id,
          innovation_id,
          scan_id,
          payment_reference: reference,
          amount: amount / 100, // Convert from kobo to naira
        });

      if (insertError) {
        console.error('Error inserting unlocked innovation:', insertError);
        throw insertError;
      }

      console.log('Innovation unlocked successfully:', { user_id, innovation_id });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in paystack-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
