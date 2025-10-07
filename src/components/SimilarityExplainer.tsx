import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

export function SimilarityExplainer() {
  const tiers = [
    {
      name: 'Very Similar',
      range: '85-100%',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      icon: AlertTriangle,
      description: 'Almost identical. May already exist.'
    },
    {
      name: 'Quite Similar',
      range: '60-85%',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      icon: TrendingUp,
      description: 'Lots in common. Check how yours is different.'
    },
    {
      name: 'Somewhat Similar',
      range: '30-60%',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      icon: Minus,
      description: 'Some overlap. Similar field or approach.'
    },
    {
      name: 'A Little Similar',
      range: '0-30%',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      icon: TrendingDown,
      description: 'Not very similar. Different idea or field.'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">How We Find Matches</CardTitle>
        </div>
        <CardDescription>
          We compare your idea against others using smart technology
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scoring Methodology */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">How We Calculate Matches</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-blue-500/5 rounded">
              <span className="text-muted-foreground">Text Match</span>
              <Badge variant="outline">50-60%</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-500/5 rounded">
              <span className="text-muted-foreground">Image Match (if you upload one)</span>
              <Badge variant="outline">40%</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-500/5 rounded">
              <span className="text-muted-foreground">Details & Tags</span>
              <Badge variant="outline">10-40%</Badge>
            </div>
          </div>
        </div>

        {/* Similarity Tiers */}
        <div>
          <h4 className="font-semibold mb-3 text-sm">Match Levels</h4>
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
          <h4 className="font-semibold mb-3 text-sm">What We Look At</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Text:</strong> We understand the meaning, not just words</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Pictures:</strong> We check images and diagrams you share</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Field:</strong> We compare the industry and type of technology</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span><strong>Keywords:</strong> We match important words and tags</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}