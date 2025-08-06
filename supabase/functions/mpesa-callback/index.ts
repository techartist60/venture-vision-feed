import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const callbackData = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(callbackData, null, 2));

    const stkCallback = callbackData.Body?.stkCallback;
    
    if (!stkCallback) {
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    if (ResultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      const amount = callbackMetadata.find((item: any) => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = callbackMetadata.find((item: any) => item.Name === 'TransactionDate')?.Value;

      // Update payment record
      const { error: updateError } = await supabase
        .from('boost_payments')
        .update({
          status: 'completed',
          mpesa_receipt_number: mpesaReceiptNumber,
          transaction_date: new Date().toISOString()
        })
        .eq('checkout_request_id', CheckoutRequestID);

      if (updateError) {
        console.error('Error updating payment:', updateError);
      } else {
        // Get the payment record to find the media_id
        const { data: payment } = await supabase
          .from('boost_payments')
          .select('media_id')
          .eq('checkout_request_id', CheckoutRequestID)
          .single();

        if (payment) {
          // Mark the media as boosted for 30 days
          const boostExpiresAt = new Date();
          boostExpiresAt.setDate(boostExpiresAt.getDate() + 30);

          const { error: mediaError } = await supabase
            .from('media_uploads')
            .update({
              is_boosted: true,
              boost_expires_at: boostExpiresAt.toISOString()
            })
            .eq('id', payment.media_id);

          if (mediaError) {
            console.error('Error updating media boost status:', mediaError);
          }
        }
      }
    } else {
      // Payment failed
      const { error: updateError } = await supabase
        .from('boost_payments')
        .update({
          status: 'failed'
        })
        .eq('checkout_request_id', CheckoutRequestID);

      if (updateError) {
        console.error('Error updating failed payment:', updateError);
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error in M-Pesa callback:', error);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});