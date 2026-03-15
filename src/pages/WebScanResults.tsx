import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Sparkles, ExternalLink, ArrowLeft, AlertCircle, CheckCircle2, Download, Palette, Lightbulb, Image } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { exportWebScanToPdf } from '@/utils/webscanPdfExport';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Progress } from '@/components/ui/progress';
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

interface ScanMetadata {
  scan_type: 'webscan';
  scanned_url: string;
  user_screenshot?: string;
  analysis: WebsiteAnalysis;
  appearance_analysis?: AppearanceAnalysis;
  similar_websites: SimilarWebsite[];
  overall_similarity_score: number;
  uniqueness_score: number;
}

export default function WebScanResults() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanData, setScanData] = useState<{
    title: string;
    created_at: string;
    metadata: ScanMetadata;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (id) fetchScan();
  }, [user, id]);

  const fetchScan = async () => {
    try {
      const { data, error } = await supabase
        .from('idescan_scans')
        .select('title, created_at, metadata')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data?.metadata) {
        setScanData({
          title: data.title,
          created_at: data.created_at,
          metadata: data.metadata as unknown as ScanMetadata
        });
      }
    } catch (error) {
      console.error('Error fetching scan:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-discovery pb-20">
        <header className="bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!scanData) {
    return (
      <div className="min-h-screen bg-gradient-discovery flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Scan Not Found</h2>
            <p className="text-muted-foreground mb-4">This scan may have been deleted.</p>
            <Button onClick={() => navigate('/idescan/history')}>Back to History</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metadata } = scanData;

  return (
    <div className="min-h-screen bg-gradient-discovery pb-20">
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/idescan/history')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Globe className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">WebScan Results</h1>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(scanData.created_at), 'PPp')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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
                <p className="font-semibold">{scanData.title}</p>
                <a 
                  href={metadata.scanned_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {metadata.scanned_url}
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
              <p className="text-sm">{metadata.analysis.mainConcept}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Problem Solved</h4>
                <p className="text-sm">{metadata.analysis.problem}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Target Audience</h4>
                <p className="text-sm">{metadata.analysis.targetAudience}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Core Features</h4>
              <div className="flex flex-wrap gap-2">
                {metadata.analysis.coreFeatures.map((feature, idx) => (
                  <span key={idx} className="px-2 py-1 bg-muted rounded-md text-xs">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-1">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {metadata.analysis.keywords.map((keyword, idx) => (
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
          <Card className={getSimilarityBg(metadata.overall_similarity_score)}>
            <CardContent className="p-6 text-center">
              <div className={`text-4xl font-bold ${getSimilarityColor(metadata.overall_similarity_score)}`}>
                {metadata.overall_similarity_score}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Overall Similarity</p>
            </CardContent>
          </Card>
          <Card className={getSimilarityBg(100 - metadata.uniqueness_score)}>
            <CardContent className="p-6 text-center">
              <div className={`text-4xl font-bold ${getSimilarityColor(100 - metadata.uniqueness_score)}`}>
                {metadata.uniqueness_score}%
              </div>
              <p className="text-sm text-muted-foreground mt-1">Uniqueness Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Website Appearance Analysis Pie Chart */}
        {metadata.appearance_analysis && (
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
                          { name: 'Overall Look', value: metadata.appearance_analysis.overallScore, color: 'hsl(var(--primary))' },
                          { name: 'Professional', value: metadata.appearance_analysis.professionalScore, color: '#22c55e' },
                          { name: 'Modern', value: metadata.appearance_analysis.modernScore, color: '#3b82f6' },
                          { name: 'Usability', value: metadata.appearance_analysis.usabilityScore, color: '#f59e0b' },
                          { name: 'Branding', value: metadata.appearance_analysis.brandingScore, color: '#8b5cf6' },
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
                      <Progress value={metadata.appearance_analysis.overallScore} className="w-20 h-2" />
                      <span className="text-sm font-bold w-10">{metadata.appearance_analysis.overallScore}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Professional</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metadata.appearance_analysis.professionalScore} className="w-20 h-2" />
                      <span className="text-sm font-bold w-10">{metadata.appearance_analysis.professionalScore}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Modern Design</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metadata.appearance_analysis.modernScore} className="w-20 h-2" />
                      <span className="text-sm font-bold w-10">{metadata.appearance_analysis.modernScore}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Usability</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metadata.appearance_analysis.usabilityScore} className="w-20 h-2" />
                      <span className="text-sm font-bold w-10">{metadata.appearance_analysis.usabilityScore}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Branding</span>
                    <div className="flex items-center gap-2">
                      <Progress value={metadata.appearance_analysis.brandingScore} className="w-20 h-2" />
                      <span className="text-sm font-bold w-10">{metadata.appearance_analysis.brandingScore}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Improvement Suggestions */}
              {metadata.appearance_analysis.suggestions && metadata.appearance_analysis.suggestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    Suggestions to Improve Appearance
                  </h4>
                  <ul className="space-y-2">
                    {metadata.appearance_analysis.suggestions.map((suggestion, idx) => (
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

        {/* Similar Websites - Premium Section */}
        <Card className={!hasActiveSubscription ? 'border-amber-500/30' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Similar Websites ({metadata.similar_websites.length})
                {!hasActiveSubscription && (
                  <Lock className="h-4 w-4 text-amber-500" />
                )}
              </CardTitle>
              {!hasActiveSubscription && (
                <Crown className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <CardDescription>
              {hasActiveSubscription 
                ? 'Websites with similar concepts ranked by similarity'
                : 'Subscribe to unlock the top 10 similar websites and track their changes'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasActiveSubscription ? (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
                <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                  Subscribe to WebScan Premium to view similar websites and monitor their changes.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button 
                    onClick={() => setPaywallOpen(true)} 
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Subscribe Now
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Starting at 50 KES/week or 150 KES/month
                </p>
              </div>
            ) : metadata.similar_websites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>No significantly similar websites found!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {metadata.similar_websites.map((website, idx) => (
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
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/idescan/webscan')}>
            New WebScan
          </Button>
          <Button 
            variant="outline"
            onClick={() => exportWebScanToPdf({
              websiteTitle: scanData.title,
              scannedUrl: metadata.scanned_url,
              analysis: metadata.analysis,
              similarWebsites: metadata.similar_websites,
              overallSimilarityScore: metadata.overall_similarity_score,
              uniquenessScore: metadata.uniqueness_score,
              scanDate: scanData.created_at,
            })}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => navigate('/idescan/history')}>
            Back to History
          </Button>
        </div>
      </div>

      {/* Premium Paywall Dialog */}
      <WebScanPremiumPaywall
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        scanId={id}
        similarWebsitesCount={scanData?.metadata?.similar_websites?.length || 10}
        onSuccess={() => {
          setPaywallOpen(false);
          checkSubscriptionAndFetchScan();
        }}
      />
    </div>
  );
}
