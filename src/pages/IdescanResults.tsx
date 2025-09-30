import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink, TrendingUp, Building2, FileText, Newspaper, Lightbulb, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface ScanData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
}

interface ResultData {
  id: string;
  similarity_score: number;
  similarity_tier: string;
  text_similarity: number | null;
  image_similarity: number | null;
  metadata_similarity: number | null;
  innovation_records: {
    title: string;
    description: string | null;
    owner: string | null;
    country: string | null;
    source_type: string;
    source_url: string | null;
    legal_status: string | null;
    patent_number: string | null;
  };
}

export default function IdescanResults() {
  const { scanId } = useParams<{ scanId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scan, setScan] = useState<ScanData | null>(null);
  const [results, setResults] = useState<ResultData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!scanId) {
      navigate('/idescan/history');
      return;
    }
    fetchScanAndResults();
  }, [user, scanId, navigate]);

  const fetchScanAndResults = async () => {
    try {
      // Fetch scan data
      const { data: scanData, error: scanError } = await supabase
        .from('idescan_scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (scanError) throw scanError;
      setScan(scanData);

      // Fetch results
      const { data: resultsData, error: resultsError } = await supabase
        .from('scan_results')
        .select(`
          *,
          innovation_records (*)
        `)
        .eq('scan_id', scanId)
        .order('similarity_score', { ascending: false });

      if (resultsError) throw resultsError;
      setResults(resultsData || []);

    } catch (error) {
      console.error('Error fetching scan results:', error);
      toast({
        title: "Error",
        description: "Failed to load scan results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (tier: string) => {
    switch (tier) {
      case 'near_duplicate':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'strong':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'related':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'patent':
        return <FileText className="h-4 w-4" />;
      case 'startup':
        return <Building2 className="h-4 w-4" />;
      case 'news':
        return <Newspaper className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-discovery pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/idescan/history')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Scan Results</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !scan ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Scan not found</h3>
              <Button onClick={() => navigate('/idescan/history')}>
                Back to History
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Scan Info Card */}
            <Card className="shadow-glow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{scan.title}</CardTitle>
                    <Badge className={scan.status === 'completed' ? 'bg-green-500/10 text-green-500' : ''}>
                      {scan.status}
                    </Badge>
                  </div>
                  {scan.image_url && (
                    <img
                      src={scan.image_url}
                      alt={scan.title}
                      className="w-32 h-32 object-cover rounded-lg ml-4"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{scan.description}</p>
                
                {scan.status === 'processing' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing scan...</span>
                      <span className="text-primary font-medium">Analyzing</span>
                    </div>
                    <Progress value={66} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Summary */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Found {results.length} Similar Innovations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-red-500">
                        {results.filter(r => r.similarity_tier === 'near_duplicate').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Near Duplicate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-500">
                        {results.filter(r => r.similarity_tier === 'strong').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Strong</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-500">
                        {results.filter(r => r.similarity_tier === 'related').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Related</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-500">
                        {results.filter(r => r.similarity_tier === 'distant').length}
                      </div>
                      <div className="text-xs text-muted-foreground">Distant</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results List */}
            {scan.status === 'pending' ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="animate-pulse mb-4">
                    <TrendingUp className="h-16 w-16 text-primary mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Scan Queued</h3>
                  <p className="text-muted-foreground">
                    Your scan will start processing shortly...
                  </p>
                </CardContent>
              </Card>
            ) : results.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Matches Found</h3>
                  <p className="text-muted-foreground mb-6">
                    No similar innovations found in our databases. Your idea might be truly unique!
                  </p>
                  <Button onClick={() => navigate('/idescan')}>
                    Start New Scan
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <Card key={result.id} className="hover:shadow-glow transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSourceIcon(result.innovation_records.source_type)}
                            <Badge variant="outline" className="text-xs">
                              {result.innovation_records.source_type}
                            </Badge>
                            {result.innovation_records.country && (
                              <Badge variant="outline" className="text-xs">
                                {result.innovation_records.country}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">
                            {result.innovation_records.title}
                          </CardTitle>
                          {result.innovation_records.owner && (
                            <p className="text-sm text-muted-foreground mt-1">
                              By {result.innovation_records.owner}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={`${getSimilarityColor(result.similarity_tier)} text-lg px-3 py-1`}>
                            {result.similarity_score.toFixed(0)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {result.similarity_tier.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {result.innovation_records.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {result.innovation_records.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {result.text_similarity && (
                            <div>Text: {result.text_similarity.toFixed(0)}%</div>
                          )}
                          {result.image_similarity && (
                            <div>Image: {result.image_similarity.toFixed(0)}%</div>
                          )}
                          {result.innovation_records.legal_status && (
                            <Badge variant="outline" className="text-xs">
                              {result.innovation_records.legal_status}
                            </Badge>
                          )}
                        </div>
                        
                        {result.innovation_records.source_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(result.innovation_records.source_url!, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Source
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}