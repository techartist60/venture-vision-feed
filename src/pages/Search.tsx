import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length > 2) {
      searchCreators();
    } else {
      setResults([]);
    }
  }, [query]);

  const searchCreators = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    navigate(`/profile/${profile.user_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-discovery">
      <div className="container mx-auto px-4 py-6">
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
          <h1 className="text-2xl font-bold text-foreground">Search Creators</h1>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for creators by name or username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-base bg-card border-border"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
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

          {!loading && query.length > 2 && results.length === 0 && (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">No creators found</h3>
              <p className="text-muted-foreground">Try searching with different keywords</p>
            </div>
          )}

          {!loading && query.length <= 2 && (
            <div className="text-center py-12">
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-foreground">Search for Creators</h3>
              <p className="text-muted-foreground">Enter at least 3 characters to start searching</p>
            </div>
          )}

          {!loading && results.map((profile) => (
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
                    <h3 className="font-semibold text-foreground truncate">
                      {profile.full_name || profile.username || 'Anonymous'}
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
          ))}
        </div>
      </div>
    </div>
  );
}