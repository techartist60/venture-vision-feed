import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink, TrendingUp, Building2, FileText, Newspaper, Lightbulb, AlertCircle, HelpCircle, Download, Search, SlidersHorizontal, Target, MapPin, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { SimilarityExplainer } from '@/components/SimilarityExplainer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';

interface ScanData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at: string;
  metadata?: {
    extractedKeywords?: string[];
    categoryScores?: {
      tech: number;
      fashion: number;
      health: number;
      agriculture: number;
      arts: number;
    };
    marketSimulation?: {
      adoptionRate: number;
      marketPenetration: number;
      competitionLevel: number;
      innovationIndex: number;
      projectedGrowth: number;
      sustainabilityScore: number;
    };
    bestSector?: string;
    bestLocation?: string;
    marketInsights?: string;
    recommendations?: string[];
    researchBased?: boolean;
  };
}

interface ResultData {
  id: string;
  innovation_id: string;
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
  const [selectedInnovation, setSelectedInnovation] = useState<ResultData | null>(null);

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
      const { data: scanData, error: scanError } = await supabase
        .from('idescan_scans')
        .select('*')
        .eq('id', scanId)
        .maybeSingle();

      if (scanError) throw scanError;
      
      if (!scanData) {
        setScan(null);
        setLoading(false);
        return;
      }
      
      setScan(scanData as ScanData);

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
        description: "Couldn't load your results",
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

  const getCleanSourceName = (url: string | null, title: string): string => {
    if (!url) return 'Unknown Source';
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // Extract domain name
      const parts = hostname.split('.');
      const domain = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      
      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      // If URL parsing fails, extract from title or return default
      return title.split(' ')[0] || 'Source';
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let filtered = results;

    if (tierFilter !== 'all') {
      filtered = filtered.filter(r => r.similarity_tier === tierFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.innovation_records.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.innovation_records.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.innovation_records.owner?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

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

  // Prepare chart data
  const categoryData = scan?.metadata?.categoryScores ? [
    { category: 'Tech', score: scan.metadata.categoryScores.tech },
    { category: 'Fashion', score: scan.metadata.categoryScores.fashion },
    { category: 'Health', score: scan.metadata.categoryScores.health },
    { category: 'Agriculture', score: scan.metadata.categoryScores.agriculture },
    { category: 'Arts', score: scan.metadata.categoryScores.arts },
  ] : [];

  const marketSimData = scan?.metadata?.marketSimulation ? [
    { metric: 'Adoption', value: scan.metadata.marketSimulation.adoptionRate },
    { metric: 'Penetration', value: scan.metadata.marketSimulation.marketPenetration },
    { metric: 'Competition', value: scan.metadata.marketSimulation.competitionLevel },
    { metric: 'Innovation', value: scan.metadata.marketSimulation.innovationIndex },
    { metric: 'Growth', value: scan.metadata.marketSimulation.projectedGrowth },
    { metric: 'Sustainability', value: scan.metadata.marketSimulation.sustainabilityScore },
  ] : [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#f97316', '#eab308', '#22c55e'];

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
            <h1 className="text-xl font-bold">Your Results</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>How We Score Matches</DialogTitle>
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
                    <CardTitle className="text-2xl mb-2">Your Idea</CardTitle>
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
                
                {scan.metadata?.extractedKeywords && scan.metadata.extractedKeywords.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Key Concepts Analyzed:</p>
                    <div className="flex flex-wrap gap-2">
                      {scan.metadata.extractedKeywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
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

            {/* Category Scores & Market Insights */}
            {scan.status === 'completed' && scan.metadata?.categoryScores && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Category Similarity Scores */}
                <Card className="shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Category Similarity Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={categoryData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: 'hsl(var(--foreground))' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Best Sector & Location */}
                <Card className="shadow-glow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Market Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Best Sector</p>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-lg">{scan.metadata.bestSector}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Best Location</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <p className="font-semibold text-lg">{scan.metadata.bestLocation}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-2">Market Insights</p>
                      <p className="text-sm">{scan.metadata.marketInsights}</p>
                    </div>
                    {scan.metadata.recommendations && scan.metadata.recommendations.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-2">Recommendations</p>
                        <ul className="space-y-1">
                          {scan.metadata.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <Zap className="h-3 w-3 mt-1 text-primary flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Market Simulation */}
            {scan.status === 'completed' && scan.metadata?.marketSimulation && (
              <Card className="shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Market Performance Simulation
                    {scan.metadata?.researchBased && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-500/10 text-green-500 border-green-500/20">
                        Research-Based
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {scan.metadata?.researchBased 
                      ? 'Data-driven projections based on actual similar innovations found in the market'
                      : 'Projected performance if launched in current market conditions'
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={marketSimData}>
                      <XAxis dataKey="metric" stroke="hsl(var(--foreground))" />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {marketSimData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Similar Ideas Section */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Similar Ideas Found ({results.length})</CardTitle>
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
                      <div className="text-xs text-muted-foreground">Very Similar</div>
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
                  <h3 className="text-lg font-semibold mb-2">Waiting to Start</h3>
                  <p className="text-muted-foreground">
                    Your search will start in a moment...
                  </p>
                </CardContent>
              </Card>
            ) : results.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Matches Found</h3>
                  <p className="text-muted-foreground mb-6">
                    We didn't find any similar ideas. Your idea might be unique!
                  </p>
                  <Button onClick={() => navigate('/idescan')}>
                    Search Another Idea
                  </Button>
                </CardContent>
              </Card>
            ) : filteredAndSortedResults.length === 0 && results.length > 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Results Match Filters</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedResults.map((result) => (
                  <Card key={result.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSourceIcon(result.innovation_records.source_type)}
                            <Badge variant="outline" className="text-xs">
                              {result.innovation_records.source_type}
                            </Badge>
                            <Badge className={getSimilarityColor(result.similarity_tier)}>
                              {result.similarity_score.toFixed(1)}% match
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            {result.innovation_records.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {result.innovation_records.description || 'No description available'}
                          </p>
                           <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {result.innovation_records.owner && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                <span>{result.innovation_records.owner}</span>
                              </div>
                            )}
                            {result.innovation_records.country && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{result.innovation_records.country}</span>
                              </div>
                            )}
                            {result.innovation_records.source_url && (
                              <div className="flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                <span className="font-medium">
                                  {getCleanSourceName(result.innovation_records.source_url, result.innovation_records.title)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedInnovation(result)}
                        >
                          View Details
                        </Button>
                        {result.innovation_records.source_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(result.innovation_records.source_url!, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View on {getCleanSourceName(result.innovation_records.source_url, result.innovation_records.title)}
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

      {/* Fullscreen Media Dialog */}
      {fullscaleMedia && (
        <Dialog open={!!fullscaleMedia} onOpenChange={() => setFullscaleMedia(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10"
              onClick={() => setFullscaleMedia(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            <img
              src={fullscaleMedia}
              alt="Full size"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Innovation Details Dialog */}
      {selectedInnovation && (
        <Dialog open={!!selectedInnovation} onOpenChange={() => setSelectedInnovation(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInnovation.innovation_records.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selectedInnovation.innovation_records.description || 'No description available'}</p>
              </div>
              {selectedInnovation.innovation_records.owner && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Owner</p>
                  <p className="text-sm">{selectedInnovation.innovation_records.owner}</p>
                </div>
              )}
              {selectedInnovation.innovation_records.country && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Country</p>
                  <p className="text-sm">{selectedInnovation.innovation_records.country}</p>
                </div>
              )}
              {selectedInnovation.innovation_records.patent_number && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Patent Number</p>
                  <p className="text-sm">{selectedInnovation.innovation_records.patent_number}</p>
                </div>
              )}
              {selectedInnovation.innovation_records.legal_status && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Legal Status</p>
                  <p className="text-sm">{selectedInnovation.innovation_records.legal_status}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">Similarity Score</p>
                <Badge className={getSimilarityColor(selectedInnovation.similarity_tier)}>
                  {selectedInnovation.similarity_score.toFixed(1)}% match
                </Badge>
              </div>
              {selectedInnovation.innovation_records.source_url && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Source</p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">
                      {getCleanSourceName(selectedInnovation.innovation_records.source_url, selectedInnovation.innovation_records.title)}
                    </Badge>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => window.open(selectedInnovation.innovation_records.source_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Article
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
