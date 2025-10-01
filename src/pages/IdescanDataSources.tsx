import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Database, 
  Building2, 
  Newspaper, 
  RefreshCw,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function IdescanDataSources() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [indexing, setIndexing] = useState<Record<string, boolean>>({});

  const dataSources = [
    {
      id: 'patents',
      title: 'Patent Databases',
      description: 'WIPO PATENTSCOPE, USPTO, Espacenet, The Lens',
      icon: FileText,
      stats: 'Global patent records',
      color: 'text-blue-500'
    },
    {
      id: 'startups',
      title: 'Startup Directories',
      description: 'Crunchbase, AngelList, startup ecosystems',
      icon: Building2,
      stats: 'Startup innovations',
      color: 'text-purple-500'
    },
    {
      id: 'news',
      title: 'Innovation News',
      description: 'TechCrunch, VentureBeat, Google News',
      icon: Newspaper,
      stats: 'Latest tech news',
      color: 'text-orange-500'
    }
  ];

  const handleIndexSource = async (sourceType: string) => {
    setIndexing(prev => ({ ...prev, [sourceType]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('index-external-sources', {
        body: { sourceType }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || `Indexed ${sourceType} successfully`,
      });
    } catch (error) {
      console.error('Error indexing source:', error);
      toast({
        title: "Error",
        description: `Failed to index ${sourceType}`,
        variant: "destructive",
      });
    } finally {
      setIndexing(prev => ({ ...prev, [sourceType]: false }));
    }
  };

  const handleIndexAll = async () => {
    setIndexing({ all: true });

    try {
      const { data, error } = await supabase.functions.invoke('index-external-sources', {
        body: { sourceType: 'all' }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Indexed all sources successfully",
      });
    } catch (error) {
      console.error('Error indexing all sources:', error);
      toast({
        title: "Error",
        description: "Failed to index all sources",
        variant: "destructive",
      });
    } finally {
      setIndexing({ all: false });
    }
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
                onClick={() => navigate('/idescan/history')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Data Sources</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Overview Card */}
        <Card className="mb-8 shadow-glow">
          <CardHeader>
            <CardTitle>External Innovation Sources</CardTitle>
            <CardDescription>
              Index data from global patent databases, startup directories, and innovation news to enhance Idescan matching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleIndexAll}
              disabled={indexing.all}
              className="w-full gap-2"
              size="lg"
            >
              {indexing.all ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Indexing All Sources...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5" />
                  Index All Sources
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Individual Sources */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Sources</h2>
          
          {dataSources.map((source) => {
            const Icon = source.icon;
            const isIndexing = indexing[source.id];

            return (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg bg-muted ${source.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {source.description}
                        </CardDescription>
                        <Badge variant="outline" className="mt-2">
                          {source.stats}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleIndexSource(source.id)}
                      disabled={isIndexing}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {isIndexing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Indexing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Index
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">About Data Sources</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Patent data is sourced from public patent databases worldwide</li>
              <li>• Startup information comes from verified business directories</li>
              <li>• News articles are aggregated from trusted technology publications</li>
              <li>• All data is indexed with AI embeddings for semantic similarity matching</li>
              <li>• Indexing runs automatically but can be manually triggered for updates</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}