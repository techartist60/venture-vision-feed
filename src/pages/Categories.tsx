import { useState } from 'react';
import { Grid3X3, TrendingUp, Lightbulb, Palette, Cpu, Leaf, Heart, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const categories = [
  {
    id: 'tech',
    name: 'Technology',
    icon: Cpu,
    count: 1250,
    trending: true,
    gradient: 'from-blue-500 to-purple-600'
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: Palette,
    count: 890,
    trending: false,
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    icon: Leaf,
    count: 567,
    trending: true,
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    id: 'art',
    name: 'Art & Design',
    icon: Palette,
    count: 1100,
    trending: false,
    gradient: 'from-orange-500 to-red-600'
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    icon: Heart,
    count: 445,
    trending: true,
    gradient: 'from-red-500 to-pink-600'
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: Gamepad2,
    count: 780,
    trending: false,
    gradient: 'from-purple-500 to-indigo-600'
  }
];

export default function Categories() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/?category=${encodeURIComponent(categoryName.toLowerCase())}`);
  };

  const handleExploreMore = () => {
    navigate('/');
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Grid3X3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Categories</h1>
          </div>
          
          <Input 
            placeholder="Search categories..." 
            className="rounded-full bg-muted/50 border-0 focus:bg-background transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      {searchQuery ? (
        // Show search results
        <section className="px-4 py-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-4">
            Search Results for "{searchQuery}"
          </h2>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Grid3X3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No categories found</h3>
              <p className="text-sm text-muted-foreground">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:shadow-card transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gradient-primary">
                      <category.icon className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.count} ideas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {category.trending && (
                      <Badge variant="outline" className="text-xs border-accent text-accent">
                        Trending
                      </Badge>
                    )}
                    <div className="w-2 h-2 rounded-full bg-primary group-hover:bg-accent transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Trending Section */}
          <section className="px-4 py-6 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">Trending Now</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {categories.filter(cat => cat.trending).map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  className="relative p-6 rounded-2xl bg-gradient-to-br shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer group"
                  style={{
                    background: `linear-gradient(135deg, var(--primary), var(--accent))`
                  }}
                >
                  <div className="relative z-10 text-center text-primary-foreground">
                    <category.icon className="h-8 w-8 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
                    <p className="text-xs opacity-90">{category.count} ideas</p>
                  </div>
                  <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground text-xs">
                    Hot
                  </Badge>
                </div>
              ))}
            </div>
          </section>

          {/* All Categories */}
          <section className="px-4 pb-8 max-w-md mx-auto">
            <h2 className="text-lg font-semibold mb-4">All Categories</h2>
            
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:shadow-card transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-gradient-primary">
                      <category.icon className="h-5 w-5 text-primary-foreground group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">{category.count} ideas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {category.trending && (
                      <Badge variant="outline" className="text-xs border-accent text-accent">
                        Trending
                      </Badge>
                    )}
                    <div className="w-2 h-2 rounded-full bg-primary group-hover:bg-accent transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Suggested for You */}
          <section className="px-4 pb-8 max-w-md mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Suggested for You</h2>
            </div>
            
            <div className="bg-gradient-discovery p-6 rounded-2xl border border-border">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-innovation rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Discover New Interests</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Based on your activity, we think you might enjoy these categories
                </p>
                <Button variant="innovation" size="sm" onClick={handleExploreMore}>
                  Explore Now
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}