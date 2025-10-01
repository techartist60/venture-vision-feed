import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Database, 
  Building2, 
  Newspaper, 
  CheckCircle2,
  FileText,
  Zap
} from 'lucide-react';

export default function IdescanDataSources() {
  const navigate = useNavigate();

  const dataSources = [
    {
      id: 'idestrim',
      title: 'Idestrim Database',
      description: 'All innovations shared by Idestrim community members',
      icon: Database,
      stats: 'Primary source',
      color: 'text-primary'
    },
    {
      id: 'patents',
      title: 'Patent Databases',
      description: 'Sample patents from global patent databases',
      icon: FileText,
      stats: 'Sample data',
      color: 'text-blue-500'
    },
    {
      id: 'startups',
      title: 'Startup Directories',
      description: 'Sample startup innovation data from directories',
      icon: Building2,
      stats: 'Sample data',
      color: 'text-purple-500'
    },
    {
      id: 'news',
      title: 'Innovation News',
      description: 'Live tech news from TechCrunch RSS feed',
      icon: Newspaper,
      stats: 'Real-time feed',
      color: 'text-orange-500'
    }
  ];

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
        <Card className="mb-8 shadow-glow border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-6 w-6 text-primary" />
              <CardTitle>Automatic Source Scanning</CardTitle>
            </div>
            <CardDescription>
              Idescan automatically searches across all these sources when you scan your innovation. No manual indexing needed!
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Individual Sources */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Data Sources Overview</h2>
          
          {dataSources.map((source) => {
            const Icon = source.icon;

            return (
              <Card key={source.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${source.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{source.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {source.description}
                      </CardDescription>
                      <Badge variant="outline" className="mt-2">
                        {source.stats}
                      </Badge>
                    </div>
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
              <CardTitle className="text-base">How It Works</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• When you upload an innovation, Idescan automatically searches all these sources</li>
              <li>• <strong>Idestrim Database</strong>: Real innovations from your community members</li>
              <li>• <strong>Innovation News</strong>: Latest tech articles from TechCrunch RSS feed</li>
              <li>• <strong>Patents</strong>: Sample patent data to demonstrate matching capabilities</li>
              <li>• <strong>Startups</strong>: Sample startup data to show similar innovations</li>
              <li>• AI embeddings enable semantic similarity matching for accurate results</li>
              <li>• Results are filtered by similarity tier: Exact, High, Moderate, or Low</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}