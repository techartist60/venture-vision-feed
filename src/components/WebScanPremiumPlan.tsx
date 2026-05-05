import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Crown, Key, Copy, Check, Loader2, Globe, Shield, Zap, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PremiumSubscription {
  id: string;
  plan_type: string;
  status: string;
  api_key: string | null;
  expires_at: string | null;
}

export default function WebScanPremiumPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    try {
      const { data } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('plan_type', 'webscan_premium')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase a premium plan",
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('intasend-payment', {
        body: {
          action: 'create_payment',
          planType: 'webscan_premium',
        },
      });

      if (error) throw error;

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const copyApiKey = () => {
    if (subscription?.api_key) {
      navigator.clipboard.writeText(subscription.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
    }
  };

  const generateApiKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('intasend-payment', {
        body: {
          action: 'generate_api_key',
          planType: 'webscan_premium',
        },
      });

      if (error) throw error;

      setSubscription(prev => prev ? { ...prev, api_key: data.apiKey } : null);
      toast({
        title: "API Key Generated",
        description: "Your new API key has been created",
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: "Error",
        description: "Failed to generate API key",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <AtomLoader size={72} />
        </CardContent>
      </Card>
    );
  }

  if (subscription) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            <CardTitle>WebScan Premium</CardTitle>
            <Badge className="bg-primary">Active</Badge>
          </div>
          <CardDescription>
            Your premium subscription is active until {new Date(subscription.expires_at!).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              Website Integration API Key
            </h4>
            {subscription.api_key ? (
              <div className="flex gap-2">
                <Input
                  value={subscription.api_key}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={copyApiKey}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button onClick={generateApiKey} variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                Generate API Key
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Add this key to your website to enable WebScan monitoring integration.
            </p>
          </div>

          {/* Integration Instructions */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h4 className="font-medium text-sm">How to Integrate</h4>
            <p className="text-xs text-muted-foreground">
              Add this script to your website's &lt;head&gt; tag:
            </p>
            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
{`<script src="https://gnhimfnwkwhusiggcowq.supabase.co/functions/v1/webscan-widget"
  data-api-key="${subscription.api_key || 'YOUR_API_KEY'}">
</script>`}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <CardTitle>WebScan Premium</CardTitle>
        </div>
        <CardDescription>
          Unlock advanced features and website integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="text-center py-4">
          <div className="text-4xl font-bold text-primary">$10</div>
          <p className="text-muted-foreground">per month</p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <span className="text-sm">API Key for website integration</span>
          </div>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm">Monitor unlimited websites</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm">Real-time similarity alerts</span>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm">Priority scanning & support</span>
          </div>
        </div>

        {/* Purchase Button */}
        <Button 
          onClick={handlePurchase} 
          disabled={purchasing}
          className="w-full gap-2"
          size="lg"
        >
          {purchasing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="h-4 w-4" />
              Subscribe Now
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Secure payment via Intasend
        </p>
      </CardContent>
    </Card>
  );
}
