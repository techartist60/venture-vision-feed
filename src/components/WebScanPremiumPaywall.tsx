import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Check, Loader2, Lock, Eye, Bell, Calendar, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WebScanPremiumPaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanId?: string;
  similarWebsitesCount: number;
  onSuccess: () => void;
}

type PlanType = 'weekly' | 'monthly';

export default function WebScanPremiumPaywall({
  open,
  onOpenChange,
  scanId,
  similarWebsitesCount,
  onSuccess,
}: WebScanPremiumPaywallProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('weekly');

  const plans: Record<PlanType, { price: number; label: string; features: string[] }> = {
    weekly: {
      price: 50,
      label: 'Weekly',
      features: [
        'Access top 10 similar websites',
        'Weekly change monitoring',
        'In-app notifications',
        'Valid for 7 days',
      ],
    },
    monthly: {
      price: 150,
      label: 'Monthly',
      features: [
        'Access top 10 similar websites',
        'Daily change monitoring',
        'In-app + email notifications',
        'Valid for 30 days',
        'Priority support',
      ],
    },
  };

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to subscribe",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const plan = plans[selectedPlan];
      
      const { data, error } = await supabase.functions.invoke('paystack-initialize', {
        body: {
          email: user.email,
          amount: plan.price,
          planType: selectedPlan,
          scanId,
          userId: user.id,
          callbackUrl: `${window.location.origin}/idescan/webscan/payment-callback`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to initialize payment');
      }

      if (!data.success) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      // Redirect to Paystack checkout
      window.location.href = data.data.authorization_url;
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to initialize payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Unlock WebScan Premium
          </DialogTitle>
          <DialogDescription>
            Access the top {Math.min(10, similarWebsitesCount)} similar websites and track their changes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What you get */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              Premium Features
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span>Top 10 websites</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span>Change alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Auto monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Priority scans</span>
              </div>
            </div>
          </div>

          {/* Plan selection */}
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(plans) as PlanType[]).map((planKey) => {
              const plan = plans[planKey];
              const isSelected = selectedPlan === planKey;
              
              return (
                <Card
                  key={planKey}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedPlan(planKey)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{plan.label}</CardTitle>
                      {planKey === 'monthly' && (
                        <Badge variant="secondary" className="text-xs">Best Value</Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">KES</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ul className="space-y-1">
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pay button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Pay {plans[selectedPlan].price} KES with Paystack
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Secure payment via Paystack. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
