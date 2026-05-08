import { AtomLoader } from '@/components/ui/AtomLoader';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Heart, MessageCircle, Pencil, Share, Bookmark, Eye, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CommentDialog } from '@/components/CommentDialog';
import SignupPrompt from '@/components/SignupPrompt';
import { cn } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';
import { LinkifiedText } from '@/utils/linkDetection';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import DynamicMetaTags from '@/components/DynamicMetaTags';
import { createNotification } from '@/utils/notifications';
import EditPostDialog from '@/components/EditPostDialog';
import { PitchDeckDialog } from '@/components/pitch/PitchDeckDialog';

// Default fallback logo for OG images
const DEFAULT_OG_IMAGE = '/idestrim-og-logo.png';

interface MediaUpload {
  id: string;
  title: string;
  description?: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  views_count: number;
  user_id: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

export default function VideoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [media, setMedia] = useState<MediaUpload | null>(null);
  const [recommendations, setRecommendations] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState<{ open: boolean; action: string }>({ open: false, action: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pitchDeckOpen, setPitchDeckOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setMedia(null);
      fetchMedia();
      fetchRecommendations();
    }
  }, [id, user]);

  const trackView = async (mediaId: string) => {
    try {
      await supabase.rpc('increment_view_count', {
        media_id: mediaId,
        viewer_user_id: user?.id || null,
        viewer_ip: null
      });
      
      setMedia(prev => prev ? { ...prev, views_count: prev.views_count + 1 } : null);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchMedia = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
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
        .eq('id', id)
        .single();

      if (error) throw error;

      if (user && data) {
        const [likesResponse, savesResponse] = await Promise.all([
          supabase
            .from('media_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('media_id', data.id)
            .single(),
          supabase
            .from('media_saves')
            .select('id')
            .eq('user_id', user.id)
            .eq('media_id', data.id)
            .single()
        ]);

        setMedia({
          ...data,
          is_liked: !!likesResponse.data,
          is_saved: !!savesResponse.data
        });
      } else {
        setMedia({
          ...data,
          is_liked: false,
          is_saved: false
        });
      }

      if (data) {
        await trackView(data.id);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
      toast({
        title: "Error",
        description: "Failed to load video",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase
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
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Shuffle recommendations
      if (data) {
        for (let i = data.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [data[i], data[j]] = [data[j], data[i]];
        }
        setRecommendations(data.slice(0, 10));
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'like this' });
      return;
    }
    if (!media) return;

    try {
      const isLiked = media.is_liked;

      if (isLiked) {
        await supabase
          .from('media_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', media.id);

        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('likes_count')
          .eq('id', media.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: Math.max(0, currentMedia.likes_count - 1) })
            .eq('id', media.id);
        }
      } else {
        await supabase
          .from('media_likes')
          .insert({
            user_id: user.id,
            media_id: media.id
          });

        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('likes_count, user_id')
          .eq('id', media.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: currentMedia.likes_count + 1 })
            .eq('id', media.id);
          
          // Send notification to media owner
          await createNotification({
            recipientId: currentMedia.user_id,
            actorId: user.id,
            type: 'like',
            mediaId: media.id
          });
        }
      }

      setMedia(prev => prev ? {
        ...prev,
        is_liked: !isLiked,
        likes_count: isLiked ? Math.max(0, prev.likes_count - 1) : prev.likes_count + 1
      } : null);

    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'save this' });
      return;
    }
    if (!media) return;

    try {
      const isSaved = media.is_saved;

      if (isSaved) {
        await supabase
          .from('media_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', media.id);

        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('saves_count')
          .eq('id', media.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: Math.max(0, currentMedia.saves_count - 1) })
            .eq('id', media.id);
        }

        toast({
          title: "Removed from saved",
          description: "Item removed from your saved items",
        });
      } else {
        await supabase
          .from('media_saves')
          .insert({
            user_id: user.id,
            media_id: media.id
          });

        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('saves_count, user_id')
          .eq('id', media.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: currentMedia.saves_count + 1 })
            .eq('id', media.id);
          
          // Send notification to media owner
          await createNotification({
            recipientId: currentMedia.user_id,
            actorId: user.id,
            type: 'save',
            mediaId: media.id
          });
        }

        toast({
          title: "Saved successfully",
          description: "Item saved to your collection",
        });
      }

      setMedia(prev => prev ? {
        ...prev,
        is_saved: !isSaved,
        saves_count: isSaved ? Math.max(0, prev.saves_count - 1) : prev.saves_count + 1
      } : null);

    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: "Error",
        description: "Failed to update save status",
        variant: "destructive",
      });
    }
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/video/${id}`;
    
    // Always copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      sonnerToast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      sonnerToast.error('Failed to copy link');
    }
  };

  const handleDelete = async () => {
    if (!media) return;
    
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from storage
      const fileName = media.media_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('media').remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('media_uploads')
        .delete()
        .eq('id', media.id);

      if (error) throw error;

      sonnerToast.success('Video deleted successfully');
      navigate('/');
    } catch (error) {
      console.error('Error deleting video:', error);
      sonnerToast.error('Failed to delete video');
    }
  };

  if (loading) {
    return <AtomLoader fullScreen size={88} label="Loading video..." />;
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Not found</h2>
          <Button onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  const isVideo = media.media_type === 'video' || media.media_type.startsWith('video/');

  // Get the OG image - use thumbnail, media URL for images, or fallback to logo
  const ogImage = media.thumbnail_url || (!isVideo ? media.media_url : null) || `${window.location.origin}${DEFAULT_OG_IMAGE}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Dynamic OG Meta Tags for sharing */}
      <DynamicMetaTags
        title={media.title}
        description={media.description || `Shared by ${media.profiles?.full_name || 'Anonymous'} on Idestrim`}
        image={ogImage}
        url={`${window.location.origin}/video/${media.id}`}
        type={isVideo ? 'video.other' : 'article'}
      />
      
      {/* Header - YouTube style */}
      <header className="bg-background border-b border-border sticky top-0 z-40">
        <div className="px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* YouTube-style layout */}
      <div className="max-w-[1800px] mx-auto">
        <div className="lg:flex lg:gap-6 lg:px-6 lg:py-6">
          {/* Main content */}
          <div className="flex-1 lg:max-w-[1280px]">
            {/* Video player */}
            <div className="relative bg-black aspect-video w-full">
            {isVideo ? (
              <video 
                key={media.id}
                ref={videoRef}
                controls
                playsInline
                preload="auto"
                autoPlay
                className="w-full h-full object-contain"
                poster={media.thumbnail_url || undefined}
                onError={(e) => {
                  console.error('Video error:', e);
                }}
              >
                <source src={media.media_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <img 
                src={media.media_url} 
                alt={media.title}
                className="w-full h-full object-contain"
                loading="eager"
              />
            )}
            </div>

            {/* Video details */}
            <div className="p-4 space-y-4">
              {/* Title */}
              <h1 className="text-xl font-semibold text-foreground">{media.title}</h1>

              {/* User info and actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => handleProfileClick(media.user_id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={media.profiles?.avatar_url} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {(media.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    {media.profiles?.full_name || 'Anonymous'}
                    {media.profiles?.is_verified && <VerifiedBadge size="sm" />}
                  </p>
                  <p className="text-sm text-muted-foreground">@{media.profiles?.username || 'anonymous'}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "gap-2 hover:text-red-500 transition-colors",
                    media.is_liked && "text-red-500"
                  )}
                  onClick={handleLike}
                >
                  <Heart className={cn("h-5 w-5", media.is_liked && "fill-current")} />
                  <span>{media.likes_count}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2" 
                  onClick={() => {
                    if (!user) {
                      setSignupPrompt({ open: true, action: 'comment' });
                      return;
                    }
                    setCommentDialogOpen(true);
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>{media.comments_count}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleShare}
                >
                  <Share className="h-5 w-5" />
                  <span>Share</span>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm"
                  className={cn(
                    "gap-2 hover:text-accent transition-colors",
                    media.is_saved && "text-accent"
                  )}
                  onClick={handleSave}
                >
                  <Bookmark className={cn("h-5 w-5", media.is_saved && "fill-current")} />
                  <span>{media.saves_count}</span>
                </Button>

                {user?.id === media.user_id && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="gap-2 hover:text-destructive transition-colors"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Delete</span>
                  </Button>
                )}
                </div>
              </div>

              {/* Description and stats - YouTube style */}
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-4 text-sm font-medium text-foreground mb-2">
                  <div className="flex items-center gap-1">
                    <span>{media.views_count.toLocaleString()} views</span>
                  </div>
                  <span>•</span>
                  <span>{new Date(media.created_at).toLocaleDateString()}</span>
                </div>
                {media.description && (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    <LinkifiedText 
                      text={media.description} 
                      linkClassName="text-primary hover:underline break-all"
                    />
                  </p>
                )}
              </div>

              {/* Comments section placeholder */}
              <div className="pt-4 border-t border-border">
                <h2 className="text-lg font-semibold mb-4">{media.comments_count} Comments</h2>
                <p className="text-sm text-muted-foreground">Comments feature coming soon...</p>
              </div>
            </div>
          </div>

          {/* Recommendations sidebar - YouTube style */}
          <aside className="lg:w-[402px] flex-shrink-0">
            <div className="space-y-2 pb-20 lg:pb-4">
              {/* Mobile: show recommendations below video */}
              <div className="lg:hidden px-4 pt-6 pb-4 border-t border-border">
                <h2 className="text-lg font-semibold mb-4">Recommended</h2>
              </div>

              {/* Desktop: sidebar recommendations */}
              <div className="hidden lg:block px-4">
                <h2 className="text-lg font-semibold mb-3">Recommended</h2>
              </div>

              <div className="space-y-2 px-4">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-all group"
                    onClick={() => {
                      navigate(`/video/${rec.id}`);
                      window.scrollTo(0, 0);
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-[168px] h-[94px] flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                      {(rec.media_type === 'video' || rec.media_type.startsWith('video/')) ? (
                        rec.thumbnail_url ? (
                          <img 
                            src={rec.thumbnail_url} 
                            alt={rec.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <video 
                            src={rec.media_url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            muted
                          />
                        )
                      ) : (
                        <img 
                          src={rec.media_url} 
                          alt={rec.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      )}
                      
                      {/* Play icon overlay for videos */}
                      {(rec.media_type === 'video' || rec.media_type.startsWith('video/')) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/60 rounded-full p-2">
                            <Play className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug mb-1">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {rec.profiles?.full_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{rec.views_count.toLocaleString()} views</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
      </div>
      </div>

      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        mediaId={media.id}
        mediaTitle={media.title}
      />
      
      <SignupPrompt
        open={signupPrompt.open}
        onOpenChange={(open) => setSignupPrompt({ ...signupPrompt, open })}
        action={signupPrompt.action}
      />
    </div>
  );
}
