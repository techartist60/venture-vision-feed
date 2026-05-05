import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function PremiumCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  const reference = searchParams.get('ref');
  const planType = searchParams.get('plan');

  useEffect(() => {
    if (!user || !reference) {
      navigate('/auth');
      return;
    }

    verifyPayment();
  }, [user, reference]);

  const verifyPayment = async () => {
    try {
      // Poll for payment status
      let attempts = 0;
      const maxAttempts = 10;

      const checkStatus = async () => {
        const { data, error } = await supabase
          .from('premium_subscriptions')
          .select('*')
          .eq('payment_reference', reference)
          .single();

        if (error) {
          throw new Error('Failed to verify payment');
        }

        if (data.status === 'active') {
          setStatus('success');
          setMessage('Payment successful! Your premium access is now active.');
          return true;
        }

        if (data.status === 'cancelled') {
          setStatus('error');
          setMessage('Payment was cancelled or failed.');
          return true;
        }

        return false;
      };

      const pollPayment = async () => {
        const done = await checkStatus();
        if (!done && attempts < maxAttempts) {
          attempts++;
          setTimeout(pollPayment, 2000);
        } else if (!done) {
          // Still pending after max attempts - might be processing
          setStatus('success');
          setMessage('Payment is being processed. Your access will be activated shortly.');
        }
      };

      await pollPayment();
    } catch (error) {
      console.error('Error verifying payment:', error);
      setStatus('error');
      setMessage('Failed to verify payment. Please contact support.');
    }
  };

  const handleContinue = () => {
    if (planType === 'webscan_premium') {
      navigate('/webscan/dashboard');
    } else if (planType === 'idemark_premium') {
      navigate('/idemark');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-discovery flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <AtomLoader size={96} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Processing Payment</h2>
              <p className="text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Button onClick={handleContinue} className="w-full">
                Continue to Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
                Try Again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
