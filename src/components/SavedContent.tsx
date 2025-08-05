import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import IdeaCard from '@/components/ui/IdeaCard';
import { CommentDialog } from '@/components/CommentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface MediaUpload {
  id: string;
  title: string;
  description?: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  user_id: string;
  is_liked: boolean;
  is_saved: boolean;
  profiles: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface SavedContentProps {
  userId: string;
}

export const SavedContent: React.FC<SavedContentProps> = ({ userId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [savedMedia, setSavedMedia] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDialog, setCommentDialog] = useState<{ open: boolean; mediaId: string; mediaTitle: string }>({
    open: false,
    mediaId: '',
    mediaTitle: ''
  });

  useEffect(() => {
    if (user && userId) {
      fetchSavedMedia();
    }
  }, [user, userId]);

  const fetchSavedMedia = async () => {
    if (!user) return;

    try {
      // Get saved media IDs for the user
      const { data: savedData, error: savedError } = await supabase
        .from('media_saves')
        .select('media_id')
        .eq('user_id', userId);

      if (savedError) throw savedError;

      if (!savedData || savedData.length === 0) {
        setSavedMedia([]);
        setLoading(false);
        return;
      }

      const mediaIds = savedData.map(save => save.media_id);

      // Get media details
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_uploads')
        .select(`
          *,
          profiles!media_uploads_user_id_fkey(full_name, username, avatar_url)
        `)
        .in('id', mediaIds)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;

      if (!mediaData) {
        setSavedMedia([]);
        setLoading(false);
        return;
      }

      // Check which ones are liked and saved by current user
      const currentUserLikes = await supabase
        .from('media_likes')
        .select('media_id')
        .eq('user_id', user.id)
        .in('media_id', mediaIds);

      const currentUserSaves = await supabase
        .from('media_saves')
        .select('media_id')
        .eq('user_id', user.id)
        .in('media_id', mediaIds);

      const likedMediaIds = new Set(currentUserLikes.data?.map(like => like.media_id) || []);
      const savedMediaIds = new Set(currentUserSaves.data?.map(save => save.media_id) || []);

      const enrichedMedia: MediaUpload[] = mediaData.map(media => ({
        ...media,
        is_liked: likedMediaIds.has(media.id),
        is_saved: savedMediaIds.has(media.id),
        profiles: media.profiles || { full_name: '', username: '', avatar_url: '' }
      }));

      setSavedMedia(enrichedMedia);
    } catch (error) {
      console.error('Error fetching saved media:', error);
      toast({
        title: "Error",
        description: "Failed to load saved content",
        variant: "destructive",
      });
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
          .eq('media_id', mediaId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_likes_count', { media_id: mediaId });
      } else {
        // Like
        await supabase
          .from('media_likes')
          .insert({ media_id: mediaId, user_id: user.id });

        await supabase.rpc('increment_likes_count', { media_id: mediaId });
      }

      // Update local state
      setSavedMedia(prev => prev.map(media => 
        media.id === mediaId 
          ? { 
              ...media, 
              is_liked: !isLiked,
              likes_count: isLiked ? media.likes_count - 1 : media.likes_count + 1
            }
          : media
      ));
    } catch (error) {
      console.error('Error updating like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (mediaId: string, isSaved: boolean) => {
    if (!user) return;

    try {
      if (isSaved) {
        // Unsave
        await supabase
          .from('media_saves')
          .delete()
          .eq('media_id', mediaId)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_saves_count', { media_id: mediaId });

        // Remove from local state since this is the saved content view
        setSavedMedia(prev => prev.filter(media => media.id !== mediaId));
      } else {
        // Save
        await supabase
          .from('media_saves')
          .insert({ media_id: mediaId, user_id: user.id });

        await supabase.rpc('increment_saves_count', { media_id: mediaId });

        // Update local state
        setSavedMedia(prev => prev.map(media => 
          media.id === mediaId 
            ? { 
                ...media, 
                is_saved: !isSaved,
                saves_count: media.saves_count + 1
              }
            : media
        ));
      }
    } catch (error) {
      console.error('Error updating save:', error);
      toast({
        title: "Error",
        description: "Failed to update save",
        variant: "destructive",
      });
    }
  };

  const handleComment = (mediaId: string, mediaTitle: string) => {
    setCommentDialog({ open: true, mediaId, mediaTitle });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl p-6 border border-border animate-pulse">
            <div className="h-48 bg-muted rounded-lg mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (savedMedia.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-innovation rounded-full flex items-center justify-center mx-auto mb-4">
          <Bookmark className="h-8 w-8 text-primary-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No saved ideas</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ideas you save will appear here
        </p>
        <Button variant="discovery" size="sm" onClick={() => navigate('/')}>
          Discover Ideas
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {savedMedia.map((media) => (
          <IdeaCard
            key={media.id}
            id={media.id}
            title={media.title}
            description={media.description || ''}
            category="saved"
            mediaType={media.media_type as 'image' | 'video'}
            mediaUrl={media.media_url}
            user={{
              name: media.profiles.full_name || media.profiles.username || 'Anonymous',
              avatar: media.profiles.avatar_url || '',
              username: media.profiles.username || 'user',
            }}
            stats={{
              likes: media.likes_count,
              comments: media.comments_count,
              shares: 0,
            }}
            isLiked={media.is_liked}
            isSaved={media.is_saved}
            onLike={() => handleLike(media.id, media.is_liked)}
            onSave={() => handleSave(media.id, media.is_saved)}
            onComment={() => handleComment(media.id, media.title)}
          />
        ))}
      </div>

      <CommentDialog
        open={commentDialog.open}
        onOpenChange={(open) => setCommentDialog(prev => ({ ...prev, open }))}
        mediaId={commentDialog.mediaId}
        mediaTitle={commentDialog.mediaTitle}
      />
    </>
  );
};