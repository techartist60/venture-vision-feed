import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink, TrendingUp, Building2, FileText, Newspaper, Lightbulb, AlertCircle, HelpCircle, Download, Search, SlidersHorizontal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { SimilarityExplainer } from '@/components/SimilarityExplainer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

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
    metadata: any;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'source'>('score');
  const [fullscaleMedia, setFullscaleMedia] = useState<string | null>(null);

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

  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    // Filter by tier
    if (tierFilter !== 'all') {
      filtered = filtered.filter(r => r.similarity_tier === tierFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.innovation_records.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.innovation_records.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.innovation_records.owner?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    const sorted = [...filtered];
    if (sortBy === 'score') {
      sorted.sort((a, b) => b.similarity_score - a.similarity_score);
    } else if (sortBy === 'source') {
      sorted.sort((a, b) => a.innovation_records.source_type.localeCompare(b.innovation_records.source_type));
    }

    return sorted;
  }, [results, tierFilter, searchQuery, sortBy]);

  const exportToCSV = () => {
    const headers = ['Title', 'Source Type', 'Similarity Score', 'Tier', 'Owner', 'Country', 'Patent Number', 'Source URL'];
    const rows = filteredAndSortedResults.map(r => [
      r.innovation_records.title,
      r.innovation_records.source_type,
      r.similarity_score.toFixed(1),
      r.similarity_tier,
      r.innovation_records.owner || '',
      r.innovation_records.country || '',
      r.innovation_records.patent_number || '',
      r.innovation_records.source_url || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idescan-results-${scan?.title || 'export'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Results exported to CSV",
    });
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>How Similarity Scoring Works</DialogTitle>
                </DialogHeader>
                <SimilarityExplainer />
              </DialogContent>
            </Dialog>
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
                      className="w-32 h-32 object-cover rounded-lg ml-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setFullscaleMedia(scan.image_url)}
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

            {/* Filters and Controls */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Found {results.length} Similar Innovations</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 text-center mb-4">
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

                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search results..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="score">Sort by Score</SelectItem>
                        <SelectItem value="source">Sort by Source</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tier Filter Tabs */}
                  <Tabs value={tierFilter} onValueChange={setTierFilter}>
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="near_duplicate">
                        <span className="hidden sm:inline">Near Dup</span>
                        <span className="sm:hidden">ND</span>
                      </TabsTrigger>
                      <TabsTrigger value="strong">Strong</TabsTrigger>
                      <TabsTrigger value="related">Related</TabsTrigger>
                      <TabsTrigger value="distant">Distant</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Results Count */}
                  <div className="text-sm text-muted-foreground text-center">
                    Showing {filteredAndSortedResults.length} of {results.length} results
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
            ) : filteredAndSortedResults.length === 0 && results.length > 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Results Match Filters</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search query
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery('');
                    setTierFilter('all');
                  }}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedResults.map((result) => (
                  <Card key={result.id} className="hover:shadow-glow transition-all">
                     <CardHeader>
                       <div className="flex items-start justify-between gap-4">
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
                         
                         {/* Display media thumbnail if available */}
                         {result.innovation_records.metadata?.thumbnail_url && (
                           <img
                             src={result.innovation_records.metadata.thumbnail_url}
                             alt={result.innovation_records.title}
                             className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                             onClick={() => setFullscaleMedia(
                               result.innovation_records.metadata.media_url || 
                               result.innovation_records.metadata.thumbnail_url
                             )}
                           />
                         )}
                         
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
                      
                      {/* Similarity Breakdown */}
                      <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Similarity Breakdown
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground">Text</span>
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500" 
                                  style={{ width: `${result.text_similarity || 0}%` }}
                                />
                              </div>
                              <span className="font-medium w-10 text-right">
                                {result.text_similarity?.toFixed(0) || 0}%
                              </span>
                            </div>
                          </div>
                          {result.image_similarity !== null && (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Image</span>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500" 
                                    style={{ width: `${result.image_similarity || 0}%` }}
                                  />
                                </div>
                                <span className="font-medium w-10 text-right">
                                  {result.image_similarity?.toFixed(0) || 0}%
                                </span>
                              </div>
                            </div>
                          )}
                          {result.metadata_similarity !== null && (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground">Metadata</span>
                              <div className="flex items-center gap-1">
                                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500" 
                                    style={{ width: `${result.metadata_similarity || 0}%` }}
                                  />
                                </div>
                                <span className="font-medium w-10 text-right">
                                  {result.metadata_similarity?.toFixed(0) || 0}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-xs">
                          {result.innovation_records.patent_number && (
                            <Badge variant="outline" className="text-xs">
                              {result.innovation_records.patent_number}
                            </Badge>
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

      {/* Fullscale Media Viewer Dialog */}
      {fullscaleMedia && (
        <Dialog open={!!fullscaleMedia} onOpenChange={() => setFullscaleMedia(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center bg-black/95">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                onClick={() => setFullscaleMedia(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              {fullscaleMedia.includes('.mp4') || fullscaleMedia.includes('video') ? (
                <video
                  src={fullscaleMedia}
                  controls
                  autoPlay
                  className="max-w-full max-h-[90vh] object-contain"
                />
              ) : (
                <img
                  src={fullscaleMedia}
                  alt="Fullscale view"
                  className="max-w-full max-h-[90vh] object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}