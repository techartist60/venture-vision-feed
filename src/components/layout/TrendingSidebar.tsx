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

        {/* Featured Creators */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Featured Creators</h3>
          </div>
          <div className="space-y-3">
            {featuredCreators.map((creator) => (
              <div key={creator.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-innovation rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">{creator.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{creator.followers} followers</span>
                      <span>•</span>
                      <span>{creator.ideas} ideas</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Follow
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Community Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Views</span>
              </div>
              <span className="text-sm font-medium">2.4M</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Likes</span>
              </div>
              <span className="text-sm font-medium">185K</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Active Creators</span>
              </div>
              <span className="text-sm font-medium">12.5K</span>
            </div>
          </div>
        </Card>
      </div>
    </aside>
  );
}