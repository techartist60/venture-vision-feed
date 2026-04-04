import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import IdeaCard from '@/components/ui/IdeaCard';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentDialog } from '@/components/CommentDialog';
import { MessageDialog } from '@/components/MessageDialog';
import { useToast } from '@/hooks/use-toast';
import SignupPrompt from './SignupPrompt';
import { createNotification } from '@/utils/notifications';

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
  investment_status?: string;
  funding_amount?: number | null;
  investment_stage?: string | null;
  pitch_summary?: string | null;
  category?: string | null;
  demo_url?: string | null;
  profiles: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean | null;
  };
  is_liked?: boolean;
  is_saved?: boolean;
  is_idemarked?: boolean;
  _source?: 'media_uploads' | 'live_links';
}

interface DiscoveryFeedProps {
  userOnly?: boolean;
  userId?: string;
  mediaType?: 'image' | 'video' | 'text' | 'youtube' | 'all';
  category?: string;
}

export const DiscoveryFeed = ({ userOnly = false, userId, mediaType = 'all', category }: DiscoveryFeedProps = {}) => {
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
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    recipientId: string;
    recipientName: string;
    recipientAvatar?: string;
    mediaId: string;
    mediaTitle: string;
  }>({
    open: false,
    recipientId: '',
    recipientName: '',
    mediaId: '',
    mediaTitle: ''
  });

  useEffect(() => {
    fetchMedia();
  }, [user, userOnly, userId, mediaType, category]);

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
            avatar_url,
            is_verified
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

      // If mediaType is specified (not 'all'), filter by media type
      if (mediaType && mediaType !== 'all') {
        query = query.eq('media_type', mediaType);
      }

      // Filter by category if specified
      if (category) {
        query = query.ilike('category', category);
      }

      // Random ordering like YouTube algorithm - using PostgreSQL RANDOM() function
      const { data, error } = await query.order('id', { ascending: false }).limit(50);

      if (error) throw error;

      // Also fetch live_links (website uploads) unless filtering by specific media type
      let liveLinkItems: MediaUpload[] = [];
      if (mediaType === 'all' || mediaType === undefined) {
        let liveLinkQuery = supabase
          .from('live_links')
          .select('*');

        if (userOnly) {
          const targetUserId = userId || user?.id;
          if (targetUserId) {
            liveLinkQuery = liveLinkQuery.eq('user_id', targetUserId);
          }
        }

        if (category) {
          liveLinkQuery = liveLinkQuery.ilike('category', category);
        }

        const { data: liveLinksData } = await liveLinkQuery.order('created_at', { ascending: false }).limit(20);

        if (liveLinksData && liveLinksData.length > 0) {
          // Fetch profiles for live link users
          const liveUserIds = [...new Set(liveLinksData.map(l => l.user_id))];
          const { data: liveProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, username, avatar_url, is_verified')
            .in('user_id', liveUserIds);

          const profileMap = new Map(
            (liveProfiles || []).map(p => [p.user_id, p])
          );

          liveLinkItems = liveLinksData.map(link => ({
            id: link.id,
            title: link.title,
            description: link.description,
            media_type: 'website',
            media_url: link.website_url,
            thumbnail_url: link.thumbnail_url,
            likes_count: link.likes_count,
            comments_count: link.comments_count,
            saves_count: link.saves_count,
            views_count: link.views_count,
            created_at: link.created_at,
            user_id: link.user_id,
            category: link.category,
            profiles: profileMap.get(link.user_id) || { full_name: 'Anonymous', username: 'user', avatar_url: null, is_verified: false },
            is_liked: false,
            is_saved: false,
            is_idemarked: false,
            _source: 'live_links' as const,
          }));
        }
      }

      // Merge media_uploads and live_links
      const allData = [...(data || []), ...liveLinkItems];

      // Shuffle the results client-side for random ordering (only if not userOnly)
      if (!userOnly) {
        for (let i = allData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allData[i], allData[j]] = [allData[j], allData[i]];
        }
      }

      if (user) {
        // Check if user has liked and saved each media, and fetch idemark status
        const mediaIds = allData.map(item => item.id);
        
        const [likesResponse, savesResponse, idemarkResponse] = await Promise.all([
          supabase
            .from('media_likes')
            .select('media_id')
            .eq('user_id', user.id)
            .in('media_id', mediaIds),
          supabase
            .from('media_saves')
            .select('media_id')
            .eq('user_id', user.id)
            .in('media_id', mediaIds),
          supabase
            .from('idemark_records')
            .select('media_id')
            .in('media_id', mediaIds)
            .eq('status', 'active')
        ]);

        const likedMediaIds = new Set(likesResponse.data?.map(like => like.media_id) || []);
        const savedMediaIds = new Set(savesResponse.data?.map(save => save.media_id) || []);
        const idemarkedMediaIds = new Set(idemarkResponse.data?.map(record => record.media_id) || []);
        
        const mediaWithInteractions = allData.map(item => ({
          ...item,
          is_liked: likedMediaIds.has(item.id),
          is_saved: savedMediaIds.has(item.id),
          is_idemarked: idemarkedMediaIds.has(item.id)
        }));

        setMedia(mediaWithInteractions);
      } else {
        // For unauthenticated users, fetch idemark status only
        const mediaIds = allData.map(item => item.id);
        const { data: idemarkData } = await supabase
          .from('idemark_records')
          .select('media_id')
          .in('media_id', mediaIds)
          .eq('status', 'active');
        
        const idemarkedMediaIds = new Set(idemarkData?.map(record => record.media_id) || []);
        
        setMedia(allData.map(item => ({
          ...item,
          is_liked: false,
          is_saved: false,
          is_idemarked: idemarkedMediaIds.has(item.id)
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

    // Optimistic update - update UI immediately for instant feedback
    const previousState = media.find(item => item.id === mediaId);
    setMedia(prev => prev.map(item => 
      item.id === mediaId 
        ? { 
            ...item, 
            is_liked: !isLiked,
            likes_count: isLiked ? Math.max(0, item.likes_count - 1) : item.likes_count + 1
          }
        : item
    ));

    try {
      // Get media owner for notification
      const mediaItem = media.find(item => item.id === mediaId);
      const ownerId = mediaItem?.user_id;

      if (isLiked) {
        // Unlike - use parallel operations for speed
        await Promise.all([
          supabase
            .from('media_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('media_id', mediaId),
          supabase.rpc('decrement_likes_count', { media_id: mediaId })
        ]);
      } else {
        // Like - use parallel operations for speed
        await Promise.all([
          supabase
            .from('media_likes')
            .insert({ user_id: user.id, media_id: mediaId }),
          supabase.rpc('increment_likes_count', { media_id: mediaId })
        ]);

        // Send notification to media owner
        if (ownerId) {
          await createNotification({
            recipientId: ownerId,
            actorId: user.id,
            type: 'like',
            mediaId: mediaId
          });
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      if (previousState) {
        setMedia(prev => prev.map(item => 
          item.id === mediaId ? previousState : item
        ));
      }
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
      // Get media owner for notification
      const mediaItem = media.find(item => item.id === mediaId);
      const ownerId = mediaItem?.user_id;

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

        // Send notification to media owner
        if (ownerId) {
          await createNotification({
            recipientId: ownerId,
            actorId: user.id,
            type: 'save',
            mediaId: mediaId
          });
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

  const handleMessage = (item: MediaUpload) => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'send messages' });
      return;
    }
    
    setMessageDialog({
      open: true,
      recipientId: item.user_id,
      recipientName: item.profiles.full_name || 'User',
      recipientAvatar: item.profiles.avatar_url || undefined,
      mediaId: item.id,
      mediaTitle: item.title
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="flex items-start gap-3 px-1">
              <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
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
    <>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {media.map((item) => (
          <IdeaCard
            key={item.id}
            id={item.id}
            title={item.title}
            description={item.description || ''}
            category={item.category || undefined}
            mediaType={(item.media_type === 'image' || item.media_type === 'video' || item.media_type === 'text' || item.media_type === 'youtube' || item.media_type === 'website') ? item.media_type : 'image'}
            mediaUrl={item.media_url}
            thumbnailUrl={item.thumbnail_url || undefined}
            user={{
              name: item.profiles?.full_name || 'Anonymous',
              username: item.profiles?.username || 'user',
              avatar: item.profiles?.avatar_url || '',
              id: item.user_id,
              isVerified: item.profiles?.is_verified || false
            }}
            stats={{
              likes: item.likes_count,
              comments: item.comments_count,
              shares: item.saves_count,
              views: item.views_count
            }}
            isLiked={item.is_liked || false}
            isSaved={item.is_saved || false}
            isIdemarked={item.is_idemarked || false}
            isOwner={user?.id === item.user_id}
            currentUserId={user?.id}
            investmentStatus={item.investment_status as 'open' | 'normal' | undefined}
            fundingAmount={item.funding_amount || undefined}
            investmentStage={item.investment_stage as 'concept' | 'prototype' | 'ready' | undefined}
            pitchSummary={item.pitch_summary || undefined}
            demoUrl={item.demo_url || undefined}
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
            onMessage={() => handleMessage(item)}
            onDelete={() => {
              setMedia(prev => prev.filter(m => m.id !== item.id));
            }}
            gridView={false}
          />
        ))}
      </div>
      
      <CommentDialog
        open={commentDialog.open}
        onOpenChange={(open) => setCommentDialog(prev => ({ ...prev, open }))}
        mediaId={commentDialog.mediaId}
        mediaTitle={commentDialog.mediaTitle}
      />

      <MessageDialog
        open={messageDialog.open}
        onOpenChange={(open) => setMessageDialog(prev => ({ ...prev, open }))}
        recipientId={messageDialog.recipientId}
        recipientName={messageDialog.recipientName}
        recipientAvatar={messageDialog.recipientAvatar}
        mediaId={messageDialog.mediaId}
        mediaTitle={messageDialog.mediaTitle}
      />
      
      <SignupPrompt
        open={signupPrompt.open}
        onOpenChange={(open) => setSignupPrompt({ ...signupPrompt, open })}
        action={signupPrompt.action}
      />
    </>
  );
};