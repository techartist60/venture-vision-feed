import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ProfileStats {
  followers: number;
  following: number;
  mediaCount: number;
}

export const useProfileData = (userId?: string) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({ followers: 0, following: 0, mediaCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    const fetchStats = async () => {
      try {
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

        setStats({
          followers: followerCount || 0,
          following: followingCount || 0,
          mediaCount: mediaCount || 0
        });

        // Check if current user is following this profile (if different users)
        if (user?.id && userId && user.id !== userId) {
          const { data: followData } = await supabase
            .from('followers')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .single();
          
          setIsFollowing(!!followData);
        }
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [targetUserId, user?.id, userId]);

  const toggleFollow = async () => {
    if (!user?.id || !userId || user.id === userId) return;

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        
        setIsFollowing(false);
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
      } else {
        // Follow
        await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: userId });
        
        setIsFollowing(true);
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  return { stats, loading, isFollowing, toggleFollow };
};