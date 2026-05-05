import { AtomLoader } from '@/components/ui/AtomLoader';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function WebScanPaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference') || searchParams.get('trxref');
      
      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.success && data.verified) {
          setStatus('success');
          setMessage('Your WebScan Premium subscription is now active!');
          toast({
            title: "Payment Successful!",
            description: "You now have access to the tracking dashboard",
          });
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('Failed to verify payment. Please try again or contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen bg-gradient-discovery flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <AtomLoader size={96} />
              </div>
              <h2 className="text-xl font-bold mb-2">Verifying Payment...</h2>
              <p className="text-muted-foreground">Please wait while we confirm your payment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Button onClick={() => navigate('/idescan/webscan/dashboard')}>
                Go to Tracking Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-bold mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/idescan/webscan')}>
                  Back to WebScan
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
