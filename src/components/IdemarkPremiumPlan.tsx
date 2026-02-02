import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Loader2, Stamp, Upload, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PremiumSubscription {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
}

interface IdemarkPremiumPlanProps {
  onSubscriptionChange?: (hasSubscription: boolean) => void;
}

export default function IdemarkPremiumPlan({ onSubscriptionChange }: IdemarkPremiumPlanProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);

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
        .eq('plan_type', 'idemark_premium')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(data);
      onSubscriptionChange?.(!!data);
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
          planType: 'idemark_premium',
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (subscription) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-green-500" />
            <CardTitle>Idemark Premium</CardTitle>
            <Badge className="bg-green-500">Active</Badge>
          </div>
          <CardDescription>
            Your premium subscription is active until {new Date(subscription.expires_at!).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium">Auto-Idemark Enabled</p>
              <p className="text-sm text-muted-foreground">
                Your uploads are automatically protected with Idemark
              </p>
            </div>
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
          <CardTitle>Idemark Premium</CardTitle>
        </div>
        <CardDescription>
          Automatically protect your ideas as you upload them
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
            <Stamp className="h-5 w-5 text-primary" />
            <span className="text-sm">Auto-Idemark on every upload</span>
          </div>
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-primary" />
            <span className="text-sm">Seamless integration with uploads</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm">Timestamp proof of ownership</span>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm">Priority verification</span>
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
