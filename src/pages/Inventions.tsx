import { useState } from 'react';
import { Play, ExternalLink, Clock, Eye, TrendingUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Mock invention videos data
const inventionVideos = [
  {
    id: '1',
    title: 'Revolutionary Solar Panel Technology',
    channel: 'TechCrunch',
    duration: '8:45',
    views: '2.1M views',
    thumbnail: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400',
    category: 'Technology',
    isNew: true
  },
  {
    id: '2',
    title: 'The Future of Vertical Farming',
    channel: 'Science & Tech',
    duration: '12:30',
    views: '890K views',
    thumbnail: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
    category: 'Agriculture',
    isTrending: true
  },
  {
    id: '3',
    title: 'Breakthrough in Electric Vehicle Batteries',
    channel: 'Future Tech',
    duration: '15:22',
    views: '1.5M views',
    thumbnail: 'https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=400',
    category: 'Technology',
    isNew: false
  },
  {
    id: '4',
    title: 'Innovative Water Purification System',
    channel: 'Green Innovations',
    duration: '6:18',
    views: '567K views',
    thumbnail: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=400',
    category: 'Environment',
    isNew: true
  }
];

const categories = ['All', 'Technology', 'Agriculture', 'Environment', 'Health', 'Energy'];

export default function Inventions() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVideos = inventionVideos.filter(video => {
    const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-gradient-innovation">
              <Play className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Invention Feed</h1>
              <p className="text-sm text-muted-foreground">Curated innovation videos</p>
            </div>
          </div>
          
          <Input 
            placeholder="Search inventions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full bg-muted/50 border-0 focus:bg-background transition-colors"
          />
        </div>
      </header>

      {/* Featured Section */}
      <section className="px-4 py-6 max-w-md mx-auto">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-innovation p-6 text-primary-foreground">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Trending Now</span>
            </div>
            <h2 className="text-xl font-bold mb-2">
              Latest Breakthrough Innovations
            </h2>
            <p className="text-primary-foreground/90 text-sm mb-4">
              Discover cutting-edge inventions that are changing the world
            </p>
            <Button variant="discovery" size="sm" className="bg-background text-primary hover:bg-white">
              Watch Now
            </Button>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="px-4 mb-6 max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Categories</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </section>

      {/* Videos List */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <div className="space-y-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                
                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>

                {/* Duration */}
                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-2">
                  {video.isNew && (
                    <Badge className="bg-accent text-accent-foreground text-xs">
                      New
                    </Badge>
                  )}
                  {video.isTrending && (
                    <Badge className="bg-gradient-innovation text-primary-foreground text-xs">
                      Trending
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{video.channel}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {video.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {video.duration}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {video.category}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <Button variant="discovery" size="lg" className="w-full">
            Load More Videos
          </Button>
        </div>
      </section>

      {/* YouTube Attribution */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Videos powered by YouTube API • Discover more on{' '}
            <Button variant="link" className="p-0 h-auto text-xs">
              YouTube
            </Button>
          </p>
        </div>
      </section>
    </div>
  );
}