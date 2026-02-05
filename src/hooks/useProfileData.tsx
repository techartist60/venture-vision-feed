import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { createNotification } from '@/utils/notifications';
interface ProfileStats {
  followers: number;
  following: number;
  mediaCount: number;
  videoCount: number;
  totalLikes: number;
  totalViews: number;
}

export const useProfileData = (userId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<ProfileStats>({ 
    followers: 0, 
    following: 0, 
    mediaCount: 0, 
    videoCount: 0, 
    totalLikes: 0,
    totalViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const targetUserId = userId || user?.id;

  const fetchStats = useCallback(async () => {
    if (!targetUserId) return;
    
    try {
      setLoading(true);
      
      // Get follower count
      const { data: followerCount } = await supabase.rpc('get_follower_count', {
        profile_user_id: targetUserId
      });

      // Get following count
      const { data: followingCount } = await supabase.rpc('get_following_count', {
        profile_user_id: targetUserId
      });

      // Get media count
      const { data: mediaCount } = await supabase.rpc('get_media_count', {
        profile_user_id: targetUserId
      });

      // Get video count
      const { data: videoCount } = await supabase.rpc('get_video_count', {
        profile_user_id: targetUserId
      });

      // Get total likes count
      const { data: totalLikes } = await supabase.rpc('get_total_likes_count', {
        profile_user_id: targetUserId
      });

      // Get total views count
      const { data: totalViews } = await supabase
        .from('media_uploads')
        .select('views_count')
        .eq('user_id', targetUserId);

      const viewsSum = totalViews?.reduce((sum, item) => sum + (item.views_count || 0), 0) || 0;

      setStats({
        followers: followerCount || 0,
        following: followingCount || 0,
        mediaCount: mediaCount || 0,
        videoCount: videoCount || 0,
        totalLikes: totalLikes || 0,
        totalViews: viewsSum
      });

      // Check if current user is following this profile (if different users)
      if (user?.id && userId && user.id !== userId) {
        const { data: followData, error: followError } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .maybeSingle();
        
        if (followError) {
          console.error('Error checking follow status:', followError);
        }
        
        setIsFollowing(!!followData);
      } else {
        // Reset isFollowing when viewing own profile
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user?.id, userId, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time followers updates - also listen for changes affecting current user
  useEffect(() => {
    if (!targetUserId) return;

    const channel = supabase
      .channel(`followers-changes-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `following_id=eq.${targetUserId}`,
        },
        () => {
          // Refetch stats when follower count changes
          fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'followers',
          filter: `follower_id=eq.${targetUserId}`,
        },
        () => {
          // Refetch stats when following count changes
          fetchStats();
        }
      );

    // If viewing another user's profile, also listen for changes to current user's follows
    if (user?.id && userId && user.id !== userId) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `follower_id=eq.${user.id}`,
        },
        () => {
          // Refetch to update isFollowing state
          fetchStats();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, user?.id, userId, fetchStats]);

  const toggleFollow = async () => {
    if (!user?.id || !userId || user.id === userId) return;

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        if (error) throw error;
        
        setIsFollowing(false);
        // Update optimistically but real-time will sync
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
        
        toast({
          title: "Unfollowed",
          description: "You are no longer following this user",
        });
      } else {
        // Follow
        const { error } = await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: userId });
        
        if (error) {
          // Check if it's a duplicate key error (already following)
          if (error.code === '23505') {
            setIsFollowing(true);
            toast({
              title: "Already following",
              description: "You are already following this user",
            });
            return;
          }
          throw error;
        }
        
        setIsFollowing(true);
        // Update optimistically but real-time will sync
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
        
        // Send follow notification
        await createNotification({
          recipientId: userId,
          actorId: user.id,
          type: 'follow'
        });
        
        toast({
          title: "Following",
          description: "You are now following this user",
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert optimistic update on error
      setIsFollowing(!isFollowing);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  return { stats, loading, isFollowing, toggleFollow, refetch: fetchStats };
};