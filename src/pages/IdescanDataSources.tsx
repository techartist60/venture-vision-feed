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
      id: 'idestrim',
      title: 'Idestrim Database',
      description: 'All innovations shared by Idestrim community',
      icon: Database,
      stats: 'Primary source',
      color: 'text-primary'
    },
    {
      id: 'patents',
      title: 'Patent Databases',
      description: 'Sample patents from global databases',
      icon: FileText,
      stats: 'Sample patent data',
      color: 'text-blue-500'
    },
    {
      id: 'startups',
      title: 'Startup Directories',
      description: 'Sample startup innovation data',
      icon: Building2,
      stats: 'Sample startup data',
      color: 'text-purple-500'
    },
    {
      id: 'news',
      title: 'Innovation News',
      description: 'Sample innovation news articles',
      icon: Newspaper,
      stats: 'Sample news data',
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
            <CardTitle>Innovation Data Sources</CardTitle>
            <CardDescription>
              Index data from Idestrim database and external sources to enhance Idescan matching
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
              <li>• <strong>Idestrim Database</strong>: Real innovations from community members (primary source)</li>
              <li>• <strong>Patent data</strong>: Sample data from public patent databases</li>
              <li>• <strong>Startup information</strong>: Sample data from business directories</li>
              <li>• <strong>News articles</strong>: Sample innovation news from tech publications</li>
              <li>• All data is indexed with AI embeddings for semantic similarity matching</li>
              <li>• Index regularly to keep the database up-to-date with latest Idestrim content</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}