import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Sparkles, ExternalLink, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

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

interface ScanMetadata {
  scan_type: 'webscan';
  scanned_url: string;
  analysis: WebsiteAnalysis;
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

        {/* Similar Websites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Similar Websites ({metadata.similar_websites.length})
            </CardTitle>
            <CardDescription>
              Websites with similar concepts ranked by similarity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metadata.similar_websites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>No significantly similar websites found!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {metadata.similar_websites.map((website, idx) => (
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
          <Button variant="outline" onClick={() => navigate('/idescan/webscan')}>
            New WebScan
          </Button>
          <Button onClick={() => navigate('/idescan/history')}>
            Back to History
          </Button>
        </div>
      </div>
    </div>
  );
}
