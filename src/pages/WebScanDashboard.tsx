import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Globe, ArrowLeft, Eye, Trash2, RefreshCw, Clock, 
  AlertCircle, CheckCircle2, ExternalLink, Crown, Bell,
  TrendingUp, Calendar, Lock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';

interface WatchedWebsite {
  id: string;
  url: string;
  name: string;
  description: string | null;
  similarity_score: number;
  last_checked_at: string | null;
  update_status: string;
  created_at: string;
  scan_id: string | null;
}

interface WebsiteChange {
  id: string;
  change_type: string;
  change_summary: string;
  detected_at: string;
}

interface UserSubscription {
  tier: string;
  max_watched_websites: number;
  scan_frequency: string;
}

export default function WebScanDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [websites, setWebsites] = useState<WatchedWebsite[]>([]);
  const [changes, setChanges] = useState<Record<string, WebsiteChange[]>>({});
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      checkSubscriptionAndFetchData();
    }
  }, [user]);

  const checkSubscriptionAndFetchData = async () => {
    setLoading(true);
    
    // First check if user has an active subscription
    const { data: subData } = await supabase
      .from('webscan_subscriptions')
      .select('id, plan_type, expires_at')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!subData) {
      setHasActiveSubscription(false);
      setLoading(false);
      return;
    }
    
    setHasActiveSubscription(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch watched websites
      const { data: watchedData, error: watchedError } = await supabase
        .from('watched_websites')
        .select('*')
        .eq('is_pinned', true)
        .order('similarity_score', { ascending: false });

      if (watchedError) throw watchedError;
      setWebsites(watchedData || []);

      // Fetch recent changes for each website
      if (watchedData && watchedData.length > 0) {
        const websiteIds = watchedData.map(w => w.id);
        const { data: changesData } = await supabase
          .from('watched_website_changes')
          .select('*')
          .in('watched_website_id', websiteIds)
          .order('detected_at', { ascending: false })
          .limit(50);

        if (changesData) {
          const groupedChanges: Record<string, WebsiteChange[]> = {};
          changesData.forEach(change => {
            if (!groupedChanges[change.watched_website_id]) {
              groupedChanges[change.watched_website_id] = [];
            }
            groupedChanges[change.watched_website_id].push(change);
          });
          setChanges(groupedChanges);
        }
      }

      // Fetch subscription tier
      const { data: subData } = await supabase
        .from('user_subscription_tiers')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      setSubscription(subData || { tier: 'free', max_watched_websites: 10, scan_frequency: 'weekly' });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load watched websites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshScan = async (websiteId: string) => {
    setRefreshing(websiteId);
    try {
      const { error } = await supabase.functions.invoke('webscan-monitor', {
        body: { websiteId, userId: user!.id },
      });

      if (error) throw error;

      toast({
        title: "Scan Complete",
        description: "Website has been re-scanned for changes",
      });

      fetchData();
    } catch (error) {
      console.error('Refresh scan error:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to refresh website scan",
        variant: "destructive",
      });
    } finally {
      setRefreshing(null);
    }
  };

  const handleRemoveWebsite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('watched_websites')
        .update({ is_pinned: false })
        .eq('id', id);

      if (error) throw error;

      setWebsites(prev => prev.filter(w => w.id !== id));
      toast({
        title: "Removed",
        description: "Website removed from monitoring",
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Error",
        description: "Failed to remove website",
        variant: "destructive",
      });
    }
    setDeleteId(null);
  };

  const getSimilarityColor = (score: number): string => {
    if (score >= 75) return 'text-red-500';
    if (score >= 50) return 'text-amber-500';
    if (score >= 25) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'updated') {
      return <Badge variant="destructive" className="gap-1"><Bell className="h-3 w-3" /> Updated</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> No Change</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-discovery pb-20">
        <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-6 w-48" />
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show paywall if no active subscription
  if (hasActiveSubscription === false) {
    return (
      <div className="min-h-screen bg-gradient-discovery pb-20">
        <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
          <div className="px-4 py-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/idescan/webscan')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Eye className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Watched Websites</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-amber-500/30">
            <CardContent className="p-8 text-center">
              <Crown className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Access to the tracking dashboard requires an active WebScan Premium subscription. 
                Scan a website and subscribe to unlock tracking for similar websites.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => navigate('/idescan/webscan')} className="gap-2">
                  <Globe className="h-4 w-4" />
                  Start a WebScan
                </Button>
                <Button variant="outline" onClick={() => navigate('/idescan/history')}>
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-discovery pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/idescan/webscan')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Eye className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Watched Websites</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/idescan/webscan')}
              >
                + New Scan
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription Info */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Crown className={subscription?.tier === 'pro' ? 'h-5 w-5 text-amber-500' : 'h-5 w-5 text-muted-foreground'} />
                  <span className="font-medium capitalize">{subscription?.tier || 'Free'} Plan</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {websites.length} / {subscription?.max_watched_websites || 10} websites monitored
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {subscription?.scan_frequency === 'daily' ? 'Daily' : 'Weekly'} scans
                </div>
              </div>
              {subscription?.tier !== 'pro' && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Websites Grid */}
        {websites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Watched Websites</h3>
              <p className="text-muted-foreground mb-4">
                Scan a website to automatically monitor the top 10 similar sites for changes.
              </p>
              <Button onClick={() => navigate('/idescan/webscan')}>
                Start a WebScan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {websites.map((website) => (
              <Card key={website.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg truncate">{website.name}</CardTitle>
                        <span className={`font-bold ${getSimilarityColor(website.similarity_score)}`}>
                          {website.similarity_score}%
                        </span>
                        {getStatusBadge(website.update_status)}
                      </div>
                      <a 
                        href={website.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {website.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRefreshScan(website.id)}
                        disabled={refreshing === website.id}
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshing === website.id ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(website.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {website.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {website.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Added {formatDistanceToNow(new Date(website.created_at))} ago
                    </span>
                    {website.last_checked_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last checked {formatDistanceToNow(new Date(website.last_checked_at))} ago
                      </span>
                    )}
                  </div>

                  {/* Recent Changes */}
                  {changes[website.id] && changes[website.id].length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Recent Changes
                      </h4>
                      <div className="space-y-2">
                        {changes[website.id].slice(0, 3).map((change) => (
                          <div key={change.id} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {change.change_type}
                            </Badge>
                            <span className="text-muted-foreground flex-1">
                              {change.change_summary}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(change.detected_at))} ago
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Monitoring?</AlertDialogTitle>
            <AlertDialogDescription>
              This website will no longer be monitored for changes. You can add it back by running a new scan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleRemoveWebsite(deleteId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
