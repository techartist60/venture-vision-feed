import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Scan, Sparkles, Link2, ExternalLink, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import SignupPrompt from '@/components/SignupPrompt';
import { Progress } from '@/components/ui/progress';

interface WebsiteAnalysis {
  problem: string;
  targetAudience: string;
  coreFeatures: string[];
  valueProposition: string;
  mainConcept: string;
  keywords: string[];
  summary: string;
}

interface SimilarWebsite {
  name: string;
  url: string;
  description: string;
  similarityScore: number;
}

interface ScanResult {
  scannedUrl: string;
  websiteTitle: string;
  analysis: WebsiteAnalysis;
  similarWebsites: SimilarWebsite[];
  overallSimilarityScore: number;
  uniquenessScore: number;
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
      // Simulate progress updates
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
      
      // Save to scan history
      const scanData = data.data as ScanResult;
      const { error: saveError } = await supabase
        .from('idescan_scans')
        .insert([{
          user_id: user.id,
          title: scanData.websiteTitle || url.trim(),
          description: scanData.analysis.summary || scanData.analysis.mainConcept,
          status: 'completed',
          metadata: JSON.parse(JSON.stringify({
            scan_type: 'webscan',
            scanned_url: scanData.scannedUrl,
            analysis: scanData.analysis,
            similar_websites: scanData.similarWebsites,
            overall_similarity_score: scanData.overallSimilarityScore,
            uniqueness_score: scanData.uniquenessScore,
          }))
        }]);

      if (saveError) {
        console.error('Failed to save scan:', saveError);
      }

      setProgressMessage('Analysis complete!');
      setResult(scanData);

      toast({
        title: "Scan Complete!",
        description: `Found ${scanData.similarWebsites.length} similar websites`,
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/idescan/history')}
            >
              Scan History
            </Button>
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
            Submit any public website URL and we'll analyze its concept, then find similar websites and ideas from around the web.
          </p>
        </div>

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

            {/* Similar Websites */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Similar Websites Found ({result.similarWebsites.length})
                </CardTitle>
                <CardDescription>
                  Websites with similar concepts ranked by similarity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.similarWebsites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p>No significantly similar websites found!</p>
                    <p className="text-sm mt-1">Your idea appears to be quite unique.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.similarWebsites.map((website, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border ${getSimilarityBg(website.similarityScore)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{website.name}</span>
                              <span className={`text-sm font-bold ${getSimilarityColor(website.similarityScore)}`}>
                                {website.similarityScore}% similar
                              </span>
                            </div>
                            <a 
                              href={website.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1 mb-2"
                            >
                              {website.url}
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {website.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => setResult(null)}>
                Scan Another Website
              </Button>
              <Button onClick={() => navigate('/idescan')}>
                Try Text-Based Scan
              </Button>
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
                <CardTitle className="text-sm">Similar Search</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  We search the web for websites with similar concepts and features
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Similarity Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  AI-powered scoring shows how similar each found website is to yours
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
    </div>
  );
}
