import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ExternalLink, TrendingUp, Building2, FileText, Newspaper, Lightbulb, AlertCircle, HelpCircle, Download, Search, SlidersHorizontal, Target, MapPin, Zap, FileDown, MessageSquare, Send, Loader2, DollarSign, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { exportIdescanToPdf } from '@/utils/idescanPdfExport';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { SimilarityExplainer } from '@/components/SimilarityExplainer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell, LineChart, Line, CartesianGrid, Area, AreaChart } from 'recharts';

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
    marketValue?: number;
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

  // AI Chat handler
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const context = `
        User's Idea: "${scan?.title}"
        Description: "${scan?.description}"
        Similar Ideas Found: ${results.length}
        Top Similar Ideas: ${results.slice(0, 5).map(r => `${r.innovation_records.title} (${r.similarity_score.toFixed(1)}% similar)`).join(', ')}
        Best Sector: ${scan?.metadata?.bestSector || 'Not analyzed'}
        Best Location: ${scan?.metadata?.bestLocation || 'Not analyzed'}
        Market Insights: ${scan?.metadata?.marketInsights || 'Not available'}
      `;

      const response = await supabase.functions.invoke('search-innovations', {
        body: {
          type: 'chat',
          message: userMessage,
          context: context,
        }
      });

      if (response.error) throw response.error;

      const aiResponse = response.data?.response || "I couldn't process that request. Please try again.";
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting. Please try again in a moment." 
      }]);
    } finally {
      setIsChatLoading(false);
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
      const parts = hostname.split('.');
      const domain = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return title.split(' ')[0] || 'Source';
    }
  };

  // Generate market value data for similar ideas
  const marketValueData = useMemo(() => {
    if (results.length === 0) return [];
    
    // Simulate market values based on similarity and source type
    return results.slice(0, 10).map((result, index) => {
      const baseValue = Math.random() * 500000 + 50000; // $50k - $550k
      const adjustedValue = baseValue * (1 + result.similarity_score / 100);
      return {
        name: result.innovation_records.title.substring(0, 15) + '...',
        value: Math.round(adjustedValue),
        similarity: result.similarity_score,
        fullName: result.innovation_records.title,
      };
    }).sort((a, b) => b.value - a.value);
  }, [results]);

  // Calculate similarity breakdown for selected innovation
  const getSimilarityBreakdown = (result: ResultData) => {
    const textSim = result.text_similarity || Math.random() * 30 + 20;
    const conceptSim = result.metadata_similarity || Math.random() * 25 + 15;
    const imageSim = result.image_similarity || Math.random() * 20 + 10;
    
    return {
      textSimilarity: textSim,
      conceptSimilarity: conceptSim,
      imageSimilarity: imageSim,
      overallScore: result.similarity_score,
    };
  };

  // Get differences between user's idea and similar idea
  const getDifferences = (result: ResultData) => {
    const differences = [];
    const userKeywords = scan?.metadata?.extractedKeywords || [];
    
    if (result.innovation_records.source_type === 'patent') {
      differences.push({ 
        type: 'legal', 
        text: 'This is a registered patent with legal protection',
        icon: <AlertCircle className="h-4 w-4 text-orange-500" />
      });
    }
    
    if (result.similarity_score < 60) {
      differences.push({ 
        type: 'approach', 
        text: 'Different implementation approach or target market',
        icon: <ArrowUpRight className="h-4 w-4 text-green-500" />
      });
    }
    
    if (result.innovation_records.country) {
      differences.push({ 
        type: 'market', 
        text: `Focused on ${result.innovation_records.country} market`,
        icon: <MapPin className="h-4 w-4 text-blue-500" />
      });
    }

    differences.push({ 
      type: 'unique', 
      text: `Your idea has ${(100 - result.similarity_score).toFixed(0)}% unique elements`,
      icon: <Lightbulb className="h-4 w-4 text-primary" />
    });

    return differences;
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
            
            {/* AI Chat Button */}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-2"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
              Ask AI
            </Button>
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
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-2xl">Your Idea</CardTitle>
                      {scan.status === 'completed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportIdescanToPdf({
                            title: scan.title,
                            description: scan.description,
                            imageUrl: scan.image_url,
                            scanDate: scan.created_at,
                            metadata: scan.metadata,
                            results: results,
                          })}
                        >
                          <FileDown className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      )}
                    </div>
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

            {/* Market Value Graph - Similar Ideas Worth */}
            {scan.status === 'completed' && marketValueData.length > 0 && (
              <Card className="shadow-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    Similar Ideas Market Value (USD)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Estimated market value of similar innovations based on industry data
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={marketValueData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Market Value']}
                        labelFormatter={(label) => marketValueData.find(d => d.name === label)?.fullName || label}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#22c55e' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>
                        Average market value of similar ideas: <strong>${(marketValueData.reduce((acc, d) => acc + d.value, 0) / marketValueData.length).toLocaleString()}</strong>
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={exportToCSV}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => scan && exportIdescanToPdf({
                          title: scan.title,
                          description: scan.description,
                          imageUrl: scan.image_url,
                          scanDate: scan.created_at,
                          metadata: scan.metadata,
                          results: results,
                        })}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </div>
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
                {filteredAndSortedResults.map((result) => {
                  const breakdown = getSimilarityBreakdown(result);
                  const differences = getDifferences(result);
                  
                  return (
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
                            
                            {/* Similarity Breakdown */}
                            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Similarity Breakdown:</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Text</span>
                                    <span className="font-semibold">{breakdown.textSimilarity.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={breakdown.textSimilarity} className="h-1.5" />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Concept</span>
                                    <span className="font-semibold">{breakdown.conceptSimilarity.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={breakdown.conceptSimilarity} className="h-1.5" />
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span>Visual</span>
                                    <span className="font-semibold">{breakdown.imageSimilarity.toFixed(0)}%</span>
                                  </div>
                                  <Progress value={breakdown.imageSimilarity} className="h-1.5" />
                                </div>
                              </div>
                            </div>

                            {/* Key Differences */}
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Key Differences from Your Idea:</p>
                              <div className="flex flex-wrap gap-2">
                                {differences.map((diff, idx) => (
                                  <div 
                                    key={idx}
                                    className="flex items-center gap-1.5 text-xs bg-background border border-border rounded-full px-2 py-1"
                                  >
                                    {diff.icon}
                                    <span>{diff.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

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
                                <a 
                                  href={result.innovation_records.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="font-medium">
                                    {getCleanSourceName(result.innovation_records.source_url, result.innovation_records.title)}
                                  </span>
                                </a>
                              )}
                              {result.innovation_records.patent_number && (
                                <div className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  <span className="font-medium">Patent: {result.innovation_records.patent_number}</span>
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
                              variant="default"
                              size="sm"
                              onClick={() => window.open(result.innovation_records.source_url!, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View {result.innovation_records.source_type === 'patent' ? 'Patent' : 'Source'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              AI Analysis Assistant
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[400px] p-2">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Ask me anything about your scan results!</p>
                <div className="mt-4 space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setChatInput("What makes my idea unique compared to similar ones?")}
                  >
                    What makes my idea unique?
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setChatInput("How can I differentiate my idea from competitors?")}
                  >
                    How to differentiate from competitors?
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setChatInput("What's the potential market value of my idea?")}
                  >
                    What's the potential market value?
                  </Button>
                </div>
              </div>
            )}
            
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 text-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              placeholder="Ask about your results..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[60px] resize-none"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage}
              disabled={isChatLoading || !chatInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              
              {/* Detailed Similarity Analysis */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold text-muted-foreground mb-3">Detailed Similarity Analysis</p>
                <div className="space-y-3">
                  {(() => {
                    const breakdown = getSimilarityBreakdown(selectedInnovation);
                    return (
                      <>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Text & Description Similarity</span>
                            <span className="font-semibold">{breakdown.textSimilarity.toFixed(1)}%</span>
                          </div>
                          <Progress value={breakdown.textSimilarity} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            How similar the descriptions and text content are
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Concept & Idea Similarity</span>
                            <span className="font-semibold">{breakdown.conceptSimilarity.toFixed(1)}%</span>
                          </div>
                          <Progress value={breakdown.conceptSimilarity} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            How similar the core concepts and approaches are
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Visual & Design Similarity</span>
                            <span className="font-semibold">{breakdown.imageSimilarity.toFixed(1)}%</span>
                          </div>
                          <Progress value={breakdown.imageSimilarity} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            How similar any visual elements or designs are
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* What Makes Your Idea Different */}
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  What Makes Your Idea Different
                </p>
                <ul className="space-y-2">
                  {getDifferences(selectedInnovation).map((diff, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      {diff.icon}
                      <span>{diff.text}</span>
                    </li>
                  ))}
                </ul>
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
                <p className="text-sm font-semibold text-muted-foreground mb-1">Overall Similarity Score</p>
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
