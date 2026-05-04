import { AtomLoader } from '@/components/ui/AtomLoader';
import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share, Bookmark, Eye, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CommentDialog } from '@/components/CommentDialog';
import SignupPrompt from '@/components/SignupPrompt';
import { cn } from '@/lib/utils';
import { linkifyText } from '@/utils/linkDetection';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';

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
  profiles: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean | null;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

export default function Slides() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedType, setFeedType] = useState<'foryou' | 'following'>('foryou');
  const [commentDialog, setCommentDialog] = useState<{ open: boolean; mediaId: string; mediaTitle: string }>({
    open: false,
    mediaId: '',
    mediaTitle: ''
  });
  const [signupPrompt, setSignupPrompt] = useState<{ open: boolean; action: string }>({ open: false, action: '' });
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVideos();
  }, [user, feedType]);

  useEffect(() => {
    // Play current video and pause others
    Object.entries(videoRefs.current).forEach(([index, video]) => {
      if (video) {
        if (parseInt(index) === currentIndex) {
          video.play().catch(console.error);
        } else {
          video.pause();
        }
      }
    });
  }, [currentIndex]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      let data;
      let error;

      if (feedType === 'following' && user) {
        // Get users that the current user follows
        const { data: followingData, error: followingError } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', user.id);

        if (followingError) throw followingError;

        const followingIds = followingData.map(f => f.following_id);

        if (followingIds.length === 0) {
          setVideos([]);
          setLoading(false);
          return;
        }

        // Fetch videos from followed users
        const response = await supabase
          .from('media_uploads')
          .select(`
            *,
            profiles!media_uploads_user_id_fkey (
              full_name,
              username,
              avatar_url,
              is_verified
            )
          `)
          .eq('media_type', 'video')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(50);

        data = response.data;
        error = response.error;
      } else {
        // For You feed - all videos
        const response = await supabase
          .from('media_uploads')
          .select(`
            *,
            profiles!media_uploads_user_id_fkey (
              full_name,
              username,
              avatar_url,
              is_verified
            )
          `)
          .eq('media_type', 'video')
          .order('created_at', { ascending: false })
          .limit(50);

        data = response.data;
        error = response.error;
      }

      if (error) throw error;

      if (user) {
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
        
        const videosWithInteractions = (data || []).map(item => ({
          ...item,
          is_liked: likedMediaIds.has(item.id),
          is_saved: savedMediaIds.has(item.id)
        }));

        setVideos(videosWithInteractions);
      } else {
        setVideos((data || []).map(item => ({
          ...item,
          is_liked: false,
          is_saved: false
        })));
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (mediaId: string) => {
    try {
      await supabase.rpc('increment_view_count', {
        media_id: mediaId,
        viewer_user_id: user?.id || null,
        viewer_ip: null
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async (mediaId: string, isLiked: boolean) => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'like this video' });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('media_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

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
        await supabase
          .from('media_likes')
          .insert({ user_id: user.id, media_id: mediaId });

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

      setVideos(prev => prev.map(item => 
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
        await supabase
          .from('media_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

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
          description: "Video removed from your saved items",
        });
      } else {
        await supabase
          .from('media_saves')
          .insert({ user_id: user.id, media_id: mediaId });

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
          description: "Video saved to your collection",
        });
      }

      setVideos(prev => prev.map(item => 
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex);
      trackView(videos[newIndex].id);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <AtomLoader size={88} label="Loading videos..." />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
          <p className="text-muted-foreground">Be the first to upload a video!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Feed Type Selector */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-center h-12">
          <button
            onClick={() => setFeedType('foryou')}
            className={cn(
              "px-6 py-2 text-sm font-semibold transition-colors relative",
              feedType === 'foryou' ? "text-white" : "text-white/60"
            )}
          >
            For You
            {feedType === 'foryou' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => {
              if (!user) {
                setSignupPrompt({ open: true, action: 'view videos from people you follow' });
                return;
              }
              setFeedType('following');
            }}
            className={cn(
              "px-6 py-2 text-sm font-semibold transition-colors relative",
              feedType === 'following' ? "text-white" : "text-white/60"
            )}
          >
            Following
            {feedType === 'following' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory bg-background pt-12"
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      
      {videos.map((video, index) => (
        <div 
          key={video.id} 
          className="h-screen snap-start relative flex items-center justify-center bg-black"
        >
          {/* Video */}
          <video
            ref={(el) => (videoRefs.current[index] = el)}
            src={video.media_url}
            className="h-full w-full object-contain"
            loop
            playsInline
            poster={video.thumbnail_url || undefined}
            onError={(e) => {
              const target = e.currentTarget;
              target.poster = 'https://placehold.co/1080x1920/333/999?text=Video';
            }}
          />

          {/* User Info - Bottom Left */}
          <div className="absolute bottom-20 left-4 right-20 z-10 text-white">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarImage src={video.profiles?.avatar_url || ''} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {(video.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm drop-shadow-lg flex items-center gap-1">
                  {video.profiles?.full_name || 'Anonymous'}
                  {video.profiles?.is_verified && <VerifiedBadge size="sm" className="text-white" />}
                </p>
                <p className="text-xs opacity-90 drop-shadow-lg">
                  @{video.profiles?.username || 'anonymous'}
                </p>
              </div>
            </div>
            
            <h3 className="font-bold text-base mb-1 drop-shadow-lg">{video.title}</h3>
            {video.description && (
              <p className="text-sm opacity-90 line-clamp-2 drop-shadow-lg">
                {linkifyText(video.description, { 
                  className: 'text-primary-foreground hover:underline break-all',
                  truncateLength: 40 
                })}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-2 text-xs opacity-90">
              <Eye className="h-3 w-3" />
              <span className="drop-shadow-lg">{video.views_count.toLocaleString()} views</span>
            </div>
          </div>

          {/* Action Buttons - Right Side */}
          <div className="absolute bottom-20 right-4 z-10 flex flex-col gap-6">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full h-12 w-12 flex flex-col items-center gap-1 bg-black/30 hover:bg-black/50 backdrop-blur-sm",
                video.is_liked && "text-red-500"
              )}
              onClick={() => handleLike(video.id, video.is_liked || false)}
            >
              <Heart className={cn("h-7 w-7", video.is_liked && "fill-current")} />
              <span className="text-xs text-white drop-shadow-lg">{video.likes_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-12 w-12 flex flex-col items-center gap-1 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white"
              onClick={() => {
                if (!user) {
                  setSignupPrompt({ open: true, action: 'comment on this video' });
                  return;
                }
                setCommentDialog({ open: true, mediaId: video.id, mediaTitle: video.title });
              }}
            >
              <MessageCircle className="h-7 w-7" />
              <span className="text-xs drop-shadow-lg">{video.comments_count}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-12 w-12 flex flex-col items-center gap-1 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white"
              onClick={() => {
                navigator.share?.({
                  title: video.title,
                  text: video.description || '',
                  url: window.location.href
                }).catch(() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link copied to clipboard" });
                });
              }}
            >
              <Share className="h-7 w-7" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "rounded-full h-12 w-12 flex flex-col items-center gap-1 bg-black/30 hover:bg-black/50 backdrop-blur-sm",
                video.is_saved ? "text-accent" : "text-white"
              )}
              onClick={() => handleSave(video.id, video.is_saved || false)}
            >
              <Bookmark className={cn("h-7 w-7", video.is_saved && "fill-current")} />
              <span className="text-xs text-white drop-shadow-lg">{video.saves_count}</span>
            </Button>
          </div>
        </div>
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
    </>
  );
}
