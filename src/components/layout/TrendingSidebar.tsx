import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TrendingUp, Users, Heart, Eye } from 'lucide-react';

const trendingCategories = [
  { name: 'Tech Innovation', count: '2.1k ideas', growth: '+12%' },
  { name: 'Sustainable Design', count: '1.8k ideas', growth: '+8%' },
  { name: 'AI & Machine Learning', count: '1.5k ideas', growth: '+15%' },
  { name: 'Green Energy', count: '1.2k ideas', growth: '+10%' },
  { name: 'Health Tech', count: '900 ideas', growth: '+7%' },
];

const featuredCreators = [
  { name: 'Alex Chen', followers: '12k', ideas: '45' },
  { name: 'Sarah Kim', followers: '8.5k', ideas: '32' },
  { name: 'Marcus Johnson', followers: '6.2k', ideas: '28' },
  { name: 'Elena Rodriguez', followers: '5.8k', ideas: '41' },
];

export default function TrendingSidebar() {
  return (
    <aside className="fixed right-0 top-16 h-full w-80 bg-background/95 backdrop-blur-md border-l border-border z-30 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Trending Categories */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Trending Categories</h3>
          </div>
          <div className="space-y-3">
            {trendingCategories.map((category, index) => (
              <div key={category.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-4">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{category.count}</p>
                  </div>
                </div>
                <span className="text-xs text-green-600 font-medium">
                  {category.growth}
                </span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </aside>
  );
}