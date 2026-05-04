import { AtomLoader } from '@/components/ui/AtomLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Calendar, Copy, ExternalLink, Clock, FileCheck, Crown, CheckCircle2, Stamp, Upload, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

interface IdemarkRecord {
  id: string;
  idemark_id: string;
  title: string;
  description: string | null;
  category: string | null;
  fingerprint_hash: string;
  marked_at: string;
  is_title_public: boolean;
  status: string;
}

interface PremiumSubscription {
  id: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
}

export default function IdemarkPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast: toastHook } = useToast();
  const [records, setRecords] = useState<IdemarkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);

  useEffect(() => {
    if (user) {
      fetchRecords();
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
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toastHook({
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
      toastHook({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('idemark_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('marked_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching idemark records:', error);
      toast.error('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const copyIdemarkId = async (idemarkId: string) => {
    await navigator.clipboard.writeText(idemarkId);
    toast.success('Idemark ID copied!');
  };

  const openVerificationPage = (idemarkId: string) => {
    navigate(`/idemark/verify/${idemarkId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AtomLoader size={72} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Stamp className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Idemark</h1>
              <p className="text-sm text-muted-foreground">Protect your intellectual property</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              What is Idemark?
            </CardTitle>
            <CardDescription>
              Protect your ideas with blockchain-backed timestamping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">Timestamp Proof</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Immutable record of when your idea was created
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <FileCheck className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">Verifiable</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Anyone can verify your Idemark authenticity
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-medium text-sm">Legal Protection</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Evidence for IP disputes and patent claims
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {subscription ? (
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
                      Your uploads are automatically protected
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-primary">$10</div>
                  <p className="text-muted-foreground">per month</p>
                </div>
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
          )}
          
          {/* Manual Idemark */}
          <Card>
            <CardHeader>
              <CardTitle>Your Idemarks ({records.length})</CardTitle>
              <CardDescription>
                Your protected ideas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate('/idemark/records')}
                >
                  View All Records
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => navigate('/upload')}
                >
                  Create New
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Idemarks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Idemarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Idemarks Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Protect your ideas by enabling Idemark when uploading
                </p>
                <Button onClick={() => navigate('/upload')}>
                  Upload an Idea
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {records.slice(0, 3).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Protected {new Date(record.marked_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyIdemarkId(record.idemark_id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openVerificationPage(record.idemark_id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {records.length > 3 && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/idemark/records')}
                  >
                    View All ({records.length}) →
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
