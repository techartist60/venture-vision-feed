import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, Video, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  is_verified?: boolean | null;
}

interface MediaUpload {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  likes_count: number;
  views_count: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    is_verified?: boolean | null;
  };
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [creatorResults, setCreatorResults] = useState<Profile[]>([]);
  const [ideaResults, setIdeaResults] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      performSearch();
    } else {
      setCreatorResults([]);
      setIdeaResults([]);
    }
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      // Search creators
      const { data: creators, error: creatorsError } = await supabase
        .from('profiles')
        .select('*, is_verified')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (creatorsError) throw creatorsError;

      // Search ideas (media uploads)
      const { data: ideas, error: ideasError } = await supabase
        .from('media_uploads')
        .select(`
          *,
          profiles:user_id (
            full_name,
            username,
            avatar_url,
            is_verified
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ideasError) throw ideasError;

      setCreatorResults(creators || []);
      setIdeaResults(ideas || []);
    } catch (error) {
      console.error('Search error:', error);
      setCreatorResults([]);
      setIdeaResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    navigate(`/profile/${profile.user_id}`);
  };

  const handleIdeaClick = (idea: MediaUpload) => {
    navigate(`/video/${idea.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-discovery">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Search</h1>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for ideas and creators..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base bg-card border-border"
            autoFocus
          />
        </div>

        {/* Results */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-16 w-16 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && query.length <= 2 && (
          <div className="text-center py-12">
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-foreground">Search Ideas & Creators</h3>
            <p className="text-muted-foreground">Enter at least 3 characters to start searching</p>
          </div>
        )}

        {!loading && query.length > 2 && (
          <Tabs defaultValue="ideas" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="ideas">
                Ideas ({ideaResults.length})
              </TabsTrigger>
              <TabsTrigger value="creators">
                Creators ({creatorResults.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ideas" className="space-y-4">
              {ideaResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No ideas found</h3>
                  <p className="text-muted-foreground">Try searching with different keywords</p>
                </div>
              ) : (
                ideaResults.map((idea) => (
                  <Card 
                    key={idea.id} 
                    className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleIdeaClick(idea)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        {/* Thumbnail */}
                        <div className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                          {idea.media_type === 'video' ? (
                            <>
                              {idea.thumbnail_url ? (
                                <img 
                                  src={idea.thumbnail_url} 
                                  alt={idea.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video 
                                  src={idea.media_url}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  muted
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/60 rounded-full p-2">
                                  <Video className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <img 
                              src={idea.media_url} 
                              alt={idea.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
                            {idea.title}
                          </h3>
                          {idea.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {idea.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={idea.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {idea.profiles?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex items-center gap-1">
                              {idea.profiles?.full_name || 'Anonymous'}
                              {idea.profiles?.is_verified && <VerifiedBadge size="sm" />}
                            </span>
                            <span>•</span>
                            <span>{idea.views_count.toLocaleString()} views</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="creators" className="space-y-4">
              {creatorResults.length === 0 ? (
                <div className="text-center py-12">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No creators found</h3>
                  <p className="text-muted-foreground">Try searching with different keywords</p>
                </div>
              ) : (
                creatorResults.map((profile) => (
                  <Card 
                    key={profile.id} 
                    className="bg-card border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleProfileClick(profile)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>
                            {profile.full_name?.charAt(0) || profile.username?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate flex items-center gap-1">
                            {profile.full_name || profile.username || 'Anonymous'}
                            {profile.is_verified && <VerifiedBadge size="sm" />}
                          </h3>
                          {profile.username && (
                            <p className="text-sm text-muted-foreground">@{profile.username}</p>
                          )}
                          {profile.bio && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {profile.bio}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}