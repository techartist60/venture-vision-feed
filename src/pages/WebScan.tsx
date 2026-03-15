import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Scan, Sparkles, Link2, ExternalLink, ArrowLeft, AlertCircle, CheckCircle2, Loader2, Download, Eye, Clock, Palette, Lightbulb, Image } from 'lucide-react';
import SignupPrompt from '@/components/SignupPrompt';
import { Progress } from '@/components/ui/progress';
import { exportWebScanToPdf } from '@/utils/webscanPdfExport';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface WebsiteAnalysis {
  problem: string;
  targetAudience: string;
  coreFeatures: string[];
  valueProposition: string;
  mainConcept: string;
  keywords: string[];
  summary: string;
}

interface AppearanceAnalysis {
  overallScore: number;
  professionalScore: number;
  modernScore: number;
  usabilityScore: number;
  brandingScore: number;
  suggestions: string[];
}

interface SimilarWebsite {
  name: string;
  url: string;
  description: string;
  similarityScore: number;
  screenshotUrl?: string;
}

interface ScanResult {
  scannedUrl: string;
  websiteTitle: string;
  userScreenshot?: string;
  analysis: WebsiteAnalysis;
  appearanceAnalysis?: AppearanceAnalysis;
  similarWebsites: SimilarWebsite[];
  overallSimilarityScore: number;
  uniquenessScore: number;
}

interface ActiveSubscription {
  id: string;
  plan_type: string;
  expires_at: string;
}

export default function WebScan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState(false);
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      const formatted = urlString.startsWith('http') ? urlString : `https://${urlString}`;
      new URL(formatted);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setSignupPrompt(true);
      return;
    }

    if (!url.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a website URL to scan",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL (e.g., example.com or https://example.com)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress(10);
    setProgressMessage('Connecting to website...');

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          const increment = Math.random() * 15;
          const messages = [
            'Extracting website content...',
            'Analyzing the idea concept...',
            'Identifying target audience...',
            'Searching for similar websites...',
            'Calculating similarity scores...',
            'Generating uniqueness report...',
          ];
          setProgressMessage(messages[Math.floor((prev + increment) / 15) % messages.length]);
          return prev + increment;
        });
      }, 2000);

      const { data, error } = await supabase.functions.invoke('webscan-analyze', {
        body: { url: url.trim() },
      });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(error.message || 'Failed to analyze website');
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      setProgress(100);
      setProgressMessage('Saving results...');
      
      const scanData = data.data as ScanResult;
      
      // Save scan to history (always saved regardless of premium status)
      const { data: scanRecord, error: saveError } = await supabase
        .from('idescan_scans')
        .insert([{
          user_id: user.id,
          title: scanData.websiteTitle || url.trim(),
          description: scanData.analysis.summary || scanData.analysis.mainConcept,
          status: 'completed',
          metadata: JSON.parse(JSON.stringify({
            scan_type: 'webscan',
            scanned_url: scanData.scannedUrl,
            user_screenshot: scanData.userScreenshot,
            analysis: scanData.analysis,
            appearance_analysis: scanData.appearanceAnalysis,
            similar_websites: scanData.similarWebsites,
            overall_similarity_score: scanData.overallSimilarityScore,
            uniqueness_score: scanData.uniquenessScore,
          }))
        }])
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save scan:', saveError);
      } else if (scanRecord) {
        setCurrentScanId(scanRecord.id);
      }

      setProgressMessage('Analysis complete!');
      setResult(scanData);

      toast({
        title: "Scan Complete!",
        description: `Found ${scanData.similarWebsites.length} similar websites.`,
      });

    } catch (error) {
      console.error('WebScan error:', error);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Couldn't analyze the website. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleUnlockPremium = () => {
    setPaywallOpen(true);
  };

  const handlePaymentSuccess = async () => {
    setPaywallOpen(false);
    await checkSubscription();
    
    // Add websites to monitoring after payment
    if (result && currentScanId && user) {
      const watchedWebsites = result.similarWebsites.slice(0, 10).map(website => ({
        user_id: user.id,
        scan_id: currentScanId,
        url: website.url,
        name: website.name,
        description: website.description,
        similarity_score: website.similarityScore,
        is_pinned: true,
      }));

      await supabase.from('watched_websites').insert(watchedWebsites);
      
      toast({
        title: "Websites Added to Monitoring!",
        description: "Top 10 similar websites are now being tracked.",
      });
      
      navigate('/idescan/webscan/dashboard');
    }
  };

  const getSimilarityColor = (score: number): string => {
    if (score >= 75) return 'text-red-500';
    if (score >= 50) return 'text-amber-500';
    if (score >= 25) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getSimilarityBg = (score: number): string => {
    if (score >= 75) return 'bg-red-500/10 border-red-500/20';
    if (score >= 50) return 'bg-amber-500/10 border-amber-500/20';
    if (score >= 25) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-green-500/10 border-green-500/20';
  };

  return (
    <div className="min-h-screen bg-gradient-discovery pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/idescan')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Globe className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">WebScan</h1>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveSubscription && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/idescan/webscan/dashboard')}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Dashboard
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/idescan/history')}
              >
                History
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-4">
            <Link2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold mb-3">URL Idea Scanner</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Submit any public website URL and we'll analyze its concept, find similar websites based on news and patents across the internet.
          </p>
        </div>

        {/* Subscription Status */}
        {hasActiveSubscription && activeSubscription && (
          <Card className="mb-6 border-green-500/30 bg-green-500/5">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">WebScan Premium Active</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires: {new Date(activeSubscription.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize">{activeSubscription.plan_type} Plan</Badge>
            </CardContent>
          </Card>
        )}

        {/* KES Premium Banner for non-subscribers */}
        {user && !hasActiveSubscription && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">WebScan Premium</p>
                  <p className="text-sm text-muted-foreground">Unlock top 10 similar websites & change tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="border-amber-500/50">50 KES/week</Badge>
                <Badge variant="outline" className="border-amber-500/50">150 KES/month</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* $10 Premium Plan for web integration (separate from KES plans) */}
        {user && (
          <div className="mb-6">
            <WebScanPremiumPlan />
          </div>
        )}

        {/* Scan Form */}
        <Card className="shadow-glow mb-8">
          <CardHeader>
            <CardTitle>Scan a Website</CardTitle>
            <CardDescription>
              Enter a public website URL to analyze its concept and find similar ideas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="url"
                    type="text"
                    placeholder="e.g., example.com or https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter any public website URL. We'll crawl and analyze its content.
                </p>
              </div>

              {loading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{progressMessage}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Website...
                  </>
                ) : (
                  <>
                    <Scan className="mr-2 h-5 w-5" />
                    Scan Website for Similar Ideas
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Scanned Website Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-lg">Scanned Website</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{result.websiteTitle}</p>
                    <a 
                      href={result.scannedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {result.scannedUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Idea Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Main Concept</h4>
                  <p className="text-sm">{result.analysis.mainConcept}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Problem Solved</h4>
                    <p className="text-sm">{result.analysis.problem}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Target Audience</h4>
                    <p className="text-sm">{result.analysis.targetAudience}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Core Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.analysis.coreFeatures.map((feature, idx) => (
                      <span key={idx} className="px-2 py-1 bg-muted rounded-md text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.analysis.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scores */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className={getSimilarityBg(result.overallSimilarityScore)}>
                <CardContent className="p-6 text-center">
                  <div className={`text-4xl font-bold ${getSimilarityColor(result.overallSimilarityScore)}`}>
                    {result.overallSimilarityScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Overall Similarity</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average similarity to found websites
                  </p>
                </CardContent>
              </Card>
              <Card className={getSimilarityBg(100 - result.uniquenessScore)}>
                <CardContent className="p-6 text-center">
                  <div className={`text-4xl font-bold ${getSimilarityColor(100 - result.uniquenessScore)}`}>
                    {result.uniquenessScore}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Uniqueness Score</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    How unique this idea appears to be
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Website Appearance Analysis Pie Chart */}
            {result.appearanceAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Website Appearance Analysis
                  </CardTitle>
                  <CardDescription>
                    Visual and design quality assessment of your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Overall Look', value: result.appearanceAnalysis.overallScore, color: 'hsl(var(--primary))' },
                              { name: 'Professional', value: result.appearanceAnalysis.professionalScore, color: '#22c55e' },
                              { name: 'Modern', value: result.appearanceAnalysis.modernScore, color: '#3b82f6' },
                              { name: 'Usability', value: result.appearanceAnalysis.usabilityScore, color: '#f59e0b' },
                              { name: 'Branding', value: result.appearanceAnalysis.brandingScore, color: '#8b5cf6' },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}%`}
                            labelLine={false}
                          >
                            {[
                              { color: 'hsl(var(--primary))' },
                              { color: '#22c55e' },
                              { color: '#3b82f6' },
                              { color: '#f59e0b' },
                              { color: '#8b5cf6' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number) => [`${value}%`, 'Score']}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall Look</span>
                        <div className="flex items-center gap-2">
                          <Progress value={result.appearanceAnalysis.overallScore} className="w-20 h-2" />
                          <span className="text-sm font-bold w-10">{result.appearanceAnalysis.overallScore}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Professional</span>
                        <div className="flex items-center gap-2">
                          <Progress value={result.appearanceAnalysis.professionalScore} className="w-20 h-2" />
                          <span className="text-sm font-bold w-10">{result.appearanceAnalysis.professionalScore}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Modern Design</span>
                        <div className="flex items-center gap-2">
                          <Progress value={result.appearanceAnalysis.modernScore} className="w-20 h-2" />
                          <span className="text-sm font-bold w-10">{result.appearanceAnalysis.modernScore}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Usability</span>
                        <div className="flex items-center gap-2">
                          <Progress value={result.appearanceAnalysis.usabilityScore} className="w-20 h-2" />
                          <span className="text-sm font-bold w-10">{result.appearanceAnalysis.usabilityScore}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Branding</span>
                        <div className="flex items-center gap-2">
                          <Progress value={result.appearanceAnalysis.brandingScore} className="w-20 h-2" />
                          <span className="text-sm font-bold w-10">{result.appearanceAnalysis.brandingScore}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Improvement Suggestions */}
                  {result.appearanceAnalysis.suggestions && result.appearanceAnalysis.suggestions.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        Suggestions to Improve Appearance
                      </h4>
                      <ul className="space-y-2">
                        {result.appearanceAnalysis.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary font-bold">{idx + 1}.</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Similar Websites - Paywalled */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Similar Websites Found ({result.similarWebsites.length})
                  </CardTitle>
                  {hasActiveSubscription ? (
                    <Badge variant="secondary" className="gap-1">
                      <Eye className="h-3 w-3" />
                      Premium
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {hasActiveSubscription 
                    ? 'Websites with similar concepts ranked by similarity - all are being monitored'
                    : 'Unlock premium to view and track the top 10 similar websites'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.similarWebsites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>No significantly similar websites found!</p>
                    <p className="text-sm mt-1">Your idea appears to be quite unique.</p>
                  </div>
                ) : hasActiveSubscription ? (
                  // Show all websites for premium users with screenshots
                  <div className="grid gap-4 md:grid-cols-2">
                    {result.similarWebsites.map((website, idx) => (
                      <Card 
                        key={idx} 
                        className={`overflow-hidden ${getSimilarityBg(website.similarityScore)}`}
                      >
                        {/* Screenshot */}
                        {website.screenshotUrl && (
                          <div className="relative border-b border-border">
                            <AspectRatio ratio={16/9}>
                              <img 
                                src={website.screenshotUrl} 
                                alt={`${website.name} homepage`}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </AspectRatio>
                            <Badge 
                              className={`absolute top-2 right-2 ${getSimilarityColor(website.similarityScore)} bg-background/90`}
                            >
                              {website.similarityScore}% similar
                            </Badge>
                          </div>
                        )}
                        {!website.screenshotUrl && (
                          <div className="h-24 bg-muted flex items-center justify-center border-b border-border">
                            <div className="text-center text-muted-foreground">
                              <Image className="h-8 w-8 mx-auto mb-1 opacity-50" />
                              <p className="text-xs">Screenshot unavailable</p>
                            </div>
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold truncate">{website.name}</span>
                            {idx < 10 && (
                              <Badge variant="outline" className="text-xs gap-1 flex-shrink-0">
                                <Eye className="h-2 w-2" />
                                Tracking
                              </Badge>
                            )}
                          </div>
                          <a 
                            href={website.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1 mb-2"
                          >
                            <span className="truncate">{website.url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {website.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Show locked state for free users
                  <div className="space-y-3">
                    {/* Show blurred preview */}
                    <div className="relative">
                      <div className="space-y-3 filter blur-sm pointer-events-none">
                        {result.similarWebsites.slice(0, 3).map((website, idx) => (
                          <div 
                            key={idx} 
                            className="p-4 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{website.name}</span>
                              <span className="text-sm font-bold text-muted-foreground">
                                {website.similarityScore}% similar
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {website.description?.substring(0, 100)}...
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      {/* Overlay with CTA */}
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                        <div className="text-center p-6">
                          <Lock className="h-10 w-10 mx-auto mb-3 text-amber-500" />
                          <h4 className="font-semibold mb-2">Unlock Top 10 Similar Websites</h4>
                          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                            Get access to detailed similarity analysis, change tracking, and notifications
                          </p>
                          <Button onClick={handleUnlockPremium} className="gap-2">
                            <Crown className="h-4 w-4" />
                            Unlock from 50 KES/week
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="outline" onClick={() => setResult(null)}>
                Scan Another Website
              </Button>
              <Button 
                variant="outline"
                onClick={() => exportWebScanToPdf({
                  websiteTitle: result.websiteTitle,
                  scannedUrl: result.scannedUrl,
                  analysis: result.analysis,
                  similarWebsites: hasActiveSubscription ? result.similarWebsites : [],
                  overallSimilarityScore: result.overallSimilarityScore,
                  uniquenessScore: result.uniquenessScore,
                })}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {hasActiveSubscription && (
                <Button onClick={() => navigate('/idescan/webscan/dashboard')}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Dashboard
                </Button>
              )}
              {!hasActiveSubscription && result.similarWebsites.length > 0 && (
                <Button onClick={handleUnlockPremium}>
                  <Crown className="mr-2 h-4 w-4" />
                  Unlock Premium
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Info Cards */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Website Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  We extract and analyze public website content to understand the core idea
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  Premium Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Subscribe to monitor top 10 similar websites for changes (from 50 KES/week)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Change Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Get notified when competitors update their content, pricing, or features
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <SignupPrompt
        open={signupPrompt}
        onOpenChange={setSignupPrompt}
        action="use WebScan"
      />

      <WebScanPremiumPaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        scanId={currentScanId || undefined}
        similarWebsitesCount={result?.similarWebsites.length || 0}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
