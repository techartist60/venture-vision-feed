import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export function SimilarityExplainer() {
  const tiers = [
    {
      name: 'Near Duplicate',
      range: '85-100%',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: AlertTriangle,
      description: 'Very high similarity. Potential IP conflict or prior art.'
    },
    {
      name: 'Strong Similarity',
      range: '60-85%',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      icon: TrendingUp,
      description: 'Significant overlap. Review carefully for differentiation.'
    },
    {
      name: 'Related',
      range: '30-60%',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      icon: Minus,
      description: 'Moderate similarity. Similar domain or approach.'
    },
    {
      name: 'Distant',
      range: '0-30%',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: TrendingDown,
      description: 'Low similarity. Different approach or domain.'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Understanding Similarity Scores</CardTitle>
        </div>
        <CardDescription>
          Our AI-powered matching engine uses weighted scoring across multiple dimensions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scoring Methodology */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">Weighted Scoring System</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-blue-500/5 rounded">
              <span className="text-muted-foreground">Text Similarity</span>
              <Badge variant="outline">50-60%</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-500/5 rounded">
              <span className="text-muted-foreground">Image Similarity (if provided)</span>
              <Badge variant="outline">40%</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-500/5 rounded">
              <span className="text-muted-foreground">Metadata & Tags</span>
              <Badge variant="outline">10-40%</Badge>
            </div>
          </div>
        </div>

        {/* Similarity Tiers */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">Similarity Tiers</h4>
          <div className="space-y-3">
            {tiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <div 
                  key={tier.name}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${tier.bgColor} ${tier.borderColor}`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 ${tier.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium text-sm ${tier.color}`}>
                        {tier.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {tier.range}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tier.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* What We Analyze */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">What We Analyze</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Semantic Text:</strong> AI embeddings capture meaning beyond keywords</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Visual Features:</strong> Image analysis for sketches and diagrams</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Domain Matching:</strong> Industry, technology category, and use case</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Tag Overlap:</strong> Keywords and technical classifications</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}