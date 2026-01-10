import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
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

    // Get the raw body for signature verification
    const bodyText = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    // Verify Paystack signature
    if (signature) {
      const hash = createHmac('sha512', paystackSecretKey)
        .update(bodyText)
        .digest('hex');

      if (hash !== signature) {
        console.error('Invalid Paystack signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const event = JSON.parse(bodyText);
    console.log('Paystack webhook event:', event.event);

    if (event.event === 'charge.success') {
      const { reference, metadata, paid_at } = event.data;
      const planType = metadata?.plan_type;
      const userId = metadata?.user_id;
      const scanId = metadata?.scan_id;

      console.log('Processing successful payment:', { reference, planType, userId });

      // Calculate subscription period
      const startDate = new Date(paid_at || Date.now());
      const endDate = new Date(startDate);
      
      if (planType === 'weekly') {
        endDate.setDate(endDate.getDate() + 7);
      } else if (planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Update subscription status to active
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
        throw new Error('Failed to update subscription status');
      }

      // Update user subscription tier
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

      // Send email notification using Resend (if configured)
      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      if (resendApiKey && metadata?.email) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Idestrim <noreply@idestrim.com>',
              to: [metadata.email],
              subject: '🎉 WebScan Premium Activated!',
              html: `
                <h1>Welcome to WebScan Premium!</h1>
                <p>Your ${planType === 'weekly' ? 'Weekly' : 'Monthly'} subscription is now active.</p>
                <p><strong>Plan:</strong> ${planType === 'weekly' ? 'Weekly (50 KES)' : 'Monthly (150 KES)'}</p>
                <p><strong>Valid until:</strong> ${endDate.toLocaleDateString()}</p>
                <p>You now have access to:</p>
                <ul>
                  <li>Top 10 similar websites tracking</li>
                  <li>Real-time change monitoring</li>
                  <li>${planType === 'monthly' ? 'Daily' : 'Weekly'} scan updates</li>
                  <li>Email notifications for changes</li>
                </ul>
                <p><a href="https://idestrim.lovable.app/idescan/webscan/dashboard">View Your Dashboard →</a></p>
              `,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }

      console.log('Payment processed successfully');
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
