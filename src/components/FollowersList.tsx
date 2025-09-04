import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Follower {
  id: string;
  follower_id: string;
  profiles: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface FollowersListProps {
  userId: string;
  onClose?: () => void;
}

export const FollowersList = ({ userId, onClose }: FollowersListProps) => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFollowers();
  }, [userId]);

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`
          id,
          follower_id,
          profiles!followers_follower_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('following_id', userId);

      if (error) throw error;
      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast({
        title: "Error",
        description: "Failed to load followers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (followerId: string) => {
    navigate(`/profile/${followerId}`);
    onClose?.();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (followers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No followers yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {followers.map((follower) => (
        <div 
          key={follower.id} 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => handleProfileClick(follower.follower_id)}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={follower.profiles?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {follower.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {follower.profiles?.full_name || 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">
              @{follower.profiles?.username || 'user'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};