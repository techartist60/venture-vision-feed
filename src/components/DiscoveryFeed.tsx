import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import IdeaCard from '@/components/ui/IdeaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentDialog } from '@/components/CommentDialog';
import { useToast } from '@/hooks/use-toast';
import SignupPrompt from './SignupPrompt';

interface MediaUpload {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url?: string | null;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  views_count: number;
  created_at: string;
  user_id: string;
  is_boosted?: boolean;
  boost_expires_at?: string | null;
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
  mediaType?: 'image' | 'video';
}

export const DiscoveryFeed = ({ userOnly = false, userId, mediaType }: DiscoveryFeedProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDialog, setCommentDialog] = useState<{ open: boolean; mediaId: string; mediaTitle: string }>({
    open: false,
    mediaId: '',
    mediaTitle: ''
  });
  const [signupPrompt, setSignupPrompt] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  useEffect(() => {
    fetchMedia();
  }, [user, userOnly, userId, mediaType]);

  // Track view for media when component mounts
  const trackView = async (mediaId: string) => {
    try {
      await supabase.rpc('increment_view_count', {
        media_id: mediaId,
        viewer_user_id: user?.id || null,
        viewer_ip: null // Will be handled server-side if needed
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchMedia = async () => {
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
        const targetUserId = userId || user?.id;
        if (!targetUserId) {
          setMedia([]);
          setLoading(false);
          return;
        }
        query = query.eq('user_id', targetUserId);
      }

      // If mediaType is specified, filter by media type
      if (mediaType) {
        query = query.eq('media_type', mediaType);
      }

      // Random ordering like YouTube algorithm - using PostgreSQL RANDOM() function
      const { data, error } = await query.order('id', { ascending: false }).limit(50);
      
      // Shuffle the results client-side for random ordering (only if not userOnly)
      if (data && !userOnly) {
        for (let i = data.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [data[i], data[j]] = [data[j], data[i]];
        }
      }

      if (error) throw error;

      if (user) {
        // Check if user has liked and saved each media
        const mediaIds = (data || []).map(item => item.id);
        
        const [likesResponse, savesResponse] = await Promise.all([
          supabase
            .from('media_likes')
            .select('media_id')
            .eq('user_id', user.id)
            .in('media_id', mediaIds),
          supabase
            .from('media_saves')
            .select('media_id')
            .eq('user_id', user.id)
            .in('media_id', mediaIds)
        ]);

        const likedMediaIds = new Set(likesResponse.data?.map(like => like.media_id) || []);
        const savedMediaIds = new Set(savesResponse.data?.map(save => save.media_id) || []);
        
        const mediaWithInteractions = (data || []).map(item => ({
          ...item,
          is_liked: likedMediaIds.has(item.id),
          is_saved: savedMediaIds.has(item.id)
        }));

        setMedia(mediaWithInteractions);
      } else {
        // For unauthenticated users, just set the media without interaction states
        setMedia((data || []).map(item => ({
          ...item,
          is_liked: false,
          is_saved: false
        })));
      }
    } catch (error) {
      console.error('Error fetching user media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (mediaId: string, isLiked: boolean) => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'like this video' });
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('media_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        // Update likes count directly with SQL
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

        // Update likes count directly with SQL
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
              likes_count: isLiked ? Math.max(0, item.likes_count - 1) : item.likes_count + 1
            }
          : item
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (mediaId: string, isSaved: boolean) => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'save this video' });
      return;
    }

    try {
      if (isSaved) {
        // Unsave
        await supabase
          .from('media_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        // Update saves count directly with SQL
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('saves_count')
          .eq('id', mediaId)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: Math.max(0, currentMedia.saves_count - 1) })
            .eq('id', mediaId);
        }

        toast({
          title: "Removed from saved",
          description: "Idea removed from your saved items",
        });
      } else {
        // Save
        await supabase
          .from('media_saves')
          .insert({ user_id: user.id, media_id: mediaId });

        // Update saves count directly with SQL
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('saves_count')
          .eq('id', mediaId)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: currentMedia.saves_count + 1 })
            .eq('id', mediaId);
        }

        toast({
          title: "Saved successfully",
          description: "Idea saved to your collection",
        });
      }

      // Update local state
      setMedia(prev => prev.map(item => 
        item.id === mediaId 
          ? { 
              ...item, 
              is_saved: !isSaved,
              saves_count: isSaved ? Math.max(0, item.saves_count - 1) : item.saves_count + 1
            }
          : item
      ));
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: "Error",
        description: "Failed to update save status",
        variant: "destructive",
      });
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
    const emptyMessage = mediaType === 'video' ? 'No videos yet' : 'No uploads yet';
    const emptyDescription = mediaType === 'video' 
      ? 'Upload your first video to see it here!' 
      : 'Upload your first photo or video to see it here!';
      
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground">{emptyDescription}</p>
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
          thumbnailUrl={item.thumbnail_url || undefined}
          user={{
            name: item.profiles?.full_name || 'Anonymous',
            username: item.profiles?.username || 'user',
            avatar: item.profiles?.avatar_url || '',
            id: item.user_id
          }}
          stats={{
            likes: item.likes_count,
            comments: item.comments_count,
            shares: item.saves_count,
            views: item.views_count
          }}
          isLiked={item.is_liked || false}
          isSaved={item.is_saved || false}
          isBoosted={item.is_boosted || false}
          isOwner={user?.id === item.user_id}
          currentUserId={user?.id}
          onLike={() => handleLike(item.id, item.is_liked || false)}
          onComment={() => {
            if (!user) {
              setSignupPrompt({ open: true, action: 'comment on this video' });
              return;
            }
            setCommentDialog({ open: true, mediaId: item.id, mediaTitle: item.title });
          }}
          onShare={() => {}}
          onSave={() => handleSave(item.id, item.is_saved || false)}
        />
      ))}
      
      <CommentDialog
        open={commentDialog.open}
        onOpenChange={(open) => setCommentDialog(prev => ({ ...prev, open }))}
        mediaId={commentDialog.mediaId}
        mediaTitle={commentDialog.mediaTitle}
      />
      
      <SignupPrompt
        open={signupPrompt.open}
        onOpenChange={(open) => setSignupPrompt({ ...signupPrompt, open })}
        action={signupPrompt.action}
      />
    </div>
  );
};