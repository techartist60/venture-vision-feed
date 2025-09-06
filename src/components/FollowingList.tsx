import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Following {
  id: string;
  following_id: string;
  profiles: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface FollowingListProps {
  userId: string;
  onClose?: () => void;
  refresh?: number; // Add refresh trigger
}

export const FollowingList = ({ userId, onClose, refresh }: FollowingListProps) => {
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFollowing();
  }, [userId, refresh]);

  // Real-time updates for following
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`following-list-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `follower_id=eq.${userId}`,
        },
        () => {
          fetchFollowing();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchFollowing = async () => {
    try {
      // First get the following
      const { data: followingData, error: followingError } = await supabase
        .from('followers')
        .select('id, following_id')
        .eq('follower_id', userId);

      if (followingError) throw followingError;

      if (!followingData || followingData.length === 0) {
        setFollowing([]);
        return;
      }

      // Get profile data for each following
      const followingIds = followingData.map(f => f.following_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', followingIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const combinedData = followingData.map(following => ({
        id: following.id,
        following_id: following.following_id,
        profiles: profilesData?.find(p => p.user_id === following.following_id) || {}
      }));

      setFollowing(combinedData);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast({
        title: "Error",
        description: "Failed to load following",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (followingId: string) => {
    navigate(`/profile/${followingId}`);
    onClose?.();
  };

  const handleUnfollow = async (followingId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) return;

    try {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId);

      setFollowing(prev => prev.filter(f => f.following_id !== followingId));
      
      toast({
        title: "Unfollowed",
        description: "You are no longer following this user",
      });
      
      // The real-time listener will automatically update the lists
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    }
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
            <div className="w-20 h-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Not following anyone yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {following.map((follow) => (
        <div 
          key={follow.id} 
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => handleProfileClick(follow.following_id)}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={follow.profiles?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {follow.profiles?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {follow.profiles?.full_name || 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">
              @{follow.profiles?.username || 'user'}
            </p>
          </div>
          {user?.id === userId && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => handleUnfollow(follow.following_id, e)}
            >
              Unfollow
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};