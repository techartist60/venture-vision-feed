import { useState, useEffect } from 'react';
import { Play, ExternalLink, Clock, Eye, TrendingUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface MediaUpload {
  id: string;
  title: string;
  description?: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

const categories = ['All', 'tech', 'fashion', 'agriculture', 'art', 'health', 'gaming'];
const categoryLabels = {
  'All': 'All',
  'tech': 'Technology', 
  'fashion': 'Fashion',
  'agriculture': 'Agriculture',
  'art': 'Art & Design',
  'health': 'Health & Wellness',
  'gaming': 'Gaming'
};

export default function Inventions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaUploads, setMediaUploads] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestUpload, setLatestUpload] = useState<MediaUpload | null>(null);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchMediaUploads();
    fetchLatestUpload();
  }, [selectedCategory]);

  const fetchMediaUploads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_uploads')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      // Apply category filter if selected
      if (selectedCategory !== 'All') {
        const categoryName = categoryLabels[selectedCategory as keyof typeof categoryLabels];
        query = query.eq('category', categoryName);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMediaUploads(data || []);
    } catch (error) {
      console.error('Error fetching media uploads:', error);
      toast({
        title: "Error",
        description: "Failed to load inventions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestUpload = async () => {
    try {
      const { data, error } = await supabase
        .from('media_uploads')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setLatestUpload(data);
    } catch (error) {
      console.error('Error fetching latest upload:', error);
    }
  };

  const handleWatchNow = () => {
    if (latestUpload) {
      navigate(`/idea/${latestUpload.id}`);
    } else {
      toast({
        title: "No content available",
        description: "No uploaded ideas found",
      });
    }
  };

  const filteredUploads = mediaUploads.filter(upload => {
    const matchesSearch = upload.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         upload.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         upload.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
            <Button 
              variant="discovery" 
              size="sm" 
              className="bg-background text-primary hover:bg-white"
              onClick={handleWatchNow}
            >
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
              {categoryLabels[category as keyof typeof categoryLabels]}
            </Button>
          ))}
        </div>
      </section>

      {/* Ideas List */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden shadow-card animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="flex gap-4">
                    <div className="h-3 bg-muted rounded w-16" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No inventions found</p>
            <Button variant="link" onClick={() => navigate('/upload')}>
              Upload your first idea
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(`/idea/${upload.id}`)}
              >
                {/* Media */}
                <div className="relative aspect-video bg-muted">
                  {upload.media_type.startsWith('image/') ? (
                    <img 
                      src={upload.media_url} 
                      alt={upload.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <video 
                      src={upload.media_url}
                      className="w-full h-full object-cover"
                      poster={upload.thumbnail_url}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  
                  {/* Play Button for videos */}
                  {upload.media_type.startsWith('video/') && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}

                  {/* Duration for videos */}
                  {upload.media_type.startsWith('video/') && (
                    <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
                      Video
                    </div>
                  )}

                  {/* New badge for recent uploads */}
                  {new Date(upload.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                    <div className="absolute top-2 left-2 flex gap-2">
                      <Badge className="bg-accent text-accent-foreground text-xs">
                        New
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {upload.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {upload.profiles?.full_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {upload.likes_count} likes
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {upload.comments_count} comments
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {upload.media_type.startsWith('video/') ? 'Video' : 'Image'}
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
        )}

        {/* Load More */}
        {!loading && filteredUploads.length > 0 && (
          <div className="mt-8 text-center">
            <Button variant="discovery" size="lg" className="w-full">
              Load More Ideas
            </Button>
          </div>
        )}
      </section>

      {/* Attribution */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Share your innovations • Powered by creativity
          </p>
        </div>
      </section>
    </div>
  );
}