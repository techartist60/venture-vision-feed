import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import IdeaCard from '@/components/ui/IdeaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle, Share, Bookmark } from 'lucide-react';

interface MediaUpload {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url?: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

interface DiscoveryFeedProps {
  userOnly?: boolean;
  userId?: string;
}

export const DiscoveryFeed = ({ userOnly = false, userId }: DiscoveryFeedProps = {}) => {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    fetchMedia();
  }, [user, userOnly, userId]);

  const fetchMedia = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('media_uploads')
        .select(`
          *,
          profiles!media_uploads_user_id_fkey (
            full_name,
            username,
            avatar_url
          )
        `);

      // If userOnly is true, filter by specified user or current user
      if (userOnly) {
        const targetUserId = userId || user.id;
        query = query.eq('user_id', targetUserId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Check if user has liked each media
      const mediaWithLikes = await Promise.all(
        (data || []).map(async (item) => {
          const { data: likeData } = await supabase
            .from('media_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('media_id', item.id)
            .single();

          return {
            ...item,
            is_liked: !!likeData,
            is_saved: false // Add saved functionality later
          };
        })
      );

      setMedia(mediaWithLikes);
    } catch (error) {
      console.error('Error fetching user media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (mediaId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('media_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        // Update likes count in database (we'll update local state below)
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('likes_count')
          .eq('id', mediaId)
          .single();
          
        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: Math.max(0, currentMedia.likes_count - 1) })
            .eq('id', mediaId);
        }
      } else {
        // Like
        await supabase
          .from('media_likes')
          .insert({ user_id: user.id, media_id: mediaId });

        // Update likes count in database (we'll update local state below)
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('likes_count')
          .eq('id', mediaId)
          .single();
          
        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: currentMedia.likes_count + 1 })
            .eq('id', mediaId);
        }
      }

      // Update local state
      setMedia(prev => prev.map(item => 
        item.id === mediaId 
          ? { 
              ...item, 
              is_liked: !isLiked,
              likes_count: isLiked ? item.likes_count - 1 : item.likes_count + 1
            }
          : item
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">No uploads yet</h3>
        <p className="text-muted-foreground">Upload your first photo or video to see it here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {media.map((item) => (
        <IdeaCard
          key={item.id}
          id={item.id}
          title={item.title}
          description={item.description || ''}
          mediaType={(item.media_type === 'image' || item.media_type === 'video') ? item.media_type : 'image'}
          mediaUrl={item.media_url}
          user={{
            name: item.profiles?.full_name || 'Anonymous',
            username: item.profiles?.username || 'user',
            avatar: item.profiles?.avatar_url || ''
          }}
          stats={{
            likes: item.likes_count,
            comments: item.comments_count,
            shares: 0
          }}
          isLiked={item.is_liked || false}
          isSaved={item.is_saved || false}
          category="Personal"
          onLike={() => handleLike(item.id, item.is_liked || false)}
          onComment={() => {}}
          onShare={() => {}}
          onSave={() => {}}
        />
      ))}
    </div>
  );
};