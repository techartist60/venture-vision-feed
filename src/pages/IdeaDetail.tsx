import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share, Bookmark, Eye, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CommentDialog } from '@/components/CommentDialog';
import SignupPrompt from '@/components/SignupPrompt';
import { LinkifiedText } from '@/utils/linkDetection';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import DynamicMetaTags from '@/components/DynamicMetaTags';
import { createNotification } from '@/utils/notifications';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '@/utils/youtube';

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
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

export default function IdeaDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [idea, setIdea] = useState<MediaUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  useEffect(() => {
    if (id) {
      checkMediaTypeAndRedirect();
    }
  }, [id]);

  const checkMediaTypeAndRedirect = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('media_uploads')
        .select('media_type')
        .eq('id', id)
        .single();

      if (error) throw error;

      // If it's a native video (not YouTube), redirect to the slides page
      if (data && data.media_type !== 'youtube' && (data.media_type === 'video' || data.media_type.startsWith('video/'))) {
        navigate(`/slides?startId=${id}`, { replace: true });
        return;
      }

      // Otherwise fetch the full idea for images
      fetchIdea();
    } catch (error) {
      console.error('Error checking media type:', error);
      fetchIdea(); // fallback to normal fetch
    }
  };

  useEffect(() => {
    // Re-fetch when user changes (for like/save status)
    if (id && user) {
      fetchIdea();
    }
  }, [user]);

  const trackView = async (mediaId: string) => {
    try {
      await supabase.rpc('increment_view_count', {
        media_id: mediaId,
        viewer_user_id: user?.id || null,
        viewer_ip: null
      });
      
      // Update local state to reflect the view count
      setIdea(prev => prev ? { ...prev, views_count: prev.views_count + 1 } : null);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const fetchIdea = async () => {
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
        // Check if user has liked and saved this media
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

        setIdea({
          ...data,
          is_liked: !!likesResponse.data,
          is_saved: !!savesResponse.data
        });
      } else {
        // For unauthenticated users
        setIdea({
          ...data,
          is_liked: false,
          is_saved: false
        });
      }

      // Track view for this media
      if (data) {
        await trackView(data.id);
      }
    } catch (error) {
      console.error('Error fetching idea:', error);
      toast({
        title: "Error",
        description: "Failed to load idea",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'like this video' });
      return;
    }
    if (!idea) return;

    try {
      const isLiked = idea.is_liked;

      if (isLiked) {
        await supabase
          .from('media_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', idea.id);

        // Update likes count directly
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('likes_count')
          .eq('id', idea.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: Math.max(0, currentMedia.likes_count - 1) })
            .eq('id', idea.id);
        }
      } else {
        await supabase
          .from('media_likes')
          .insert({
            user_id: user.id,
            media_id: idea.id
          });

        // Update likes count directly
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('likes_count, user_id')
          .eq('id', idea.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: currentMedia.likes_count + 1 })
            .eq('id', idea.id);
          
          // Send notification to media owner
          await createNotification({
            recipientId: currentMedia.user_id,
            actorId: user.id,
            type: 'like',
            mediaId: idea.id
          });
        }
      }

      setIdea(prev => prev ? {
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
      setSignupPrompt({ open: true, action: 'save this video' });
      return;
    }
    if (!idea) return;

    try {
      const isSaved = idea.is_saved;

      if (isSaved) {
        await supabase
          .from('media_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', idea.id);

        // Update saves count directly
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('saves_count')
          .eq('id', idea.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: Math.max(0, currentMedia.saves_count - 1) })
            .eq('id', idea.id);
        }

        toast({
          title: "Removed from saved",
          description: "Idea removed from your saved items",
        });
      } else {
        await supabase
          .from('media_saves')
          .insert({
            user_id: user.id,
            media_id: idea.id
          });

        // Update saves count directly
        const { data: currentMedia } = await supabase
          .from('media_uploads')
          .select('saves_count, user_id')
          .eq('id', idea.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: currentMedia.saves_count + 1 })
            .eq('id', idea.id);
          
          // Send notification to media owner
          await createNotification({
            recipientId: currentMedia.user_id,
            actorId: user.id,
            type: 'save',
            mediaId: idea.id
          });
        }

        toast({
          title: "Saved successfully",
          description: "Idea saved to your collection",
        });
      }

      setIdea(prev => prev ? {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="aspect-video bg-muted rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Idea not found</h2>
          <Button onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  // Get the OG image - use thumbnail, media URL, or fallback to logo
  const ogImage = idea.thumbnail_url || idea.media_url || `${window.location.origin}${DEFAULT_OG_IMAGE}`;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Dynamic OG Meta Tags for sharing */}
      <DynamicMetaTags
        title={idea.title}
        description={idea.description || `Shared by ${idea.profiles?.full_name || 'Anonymous'} on Idestrim`}
        image={ogImage}
        url={`${window.location.origin}/idea/${idea.id}`}
        type="article"
      />
      
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Idea Detail</h1>
          </div>
        </div>
      </header>

      {/* Media */}
      <section className="px-4 py-6 max-w-md mx-auto">
        <div className="relative bg-muted rounded-xl overflow-hidden mb-6">
          {idea.media_type === 'youtube' ? (
            (() => {
              const videoId = extractYouTubeVideoId(idea.media_url);
              return videoId ? (
                <div className="aspect-video">
                  <iframe
                    src={getYouTubeEmbedUrl(videoId)}
                    title={idea.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img 
                  src={idea.thumbnail_url || '/placeholder.svg'} 
                  alt={idea.title}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              );
            })()
          ) : (
            <img 
              src={idea.media_url} 
              alt={idea.title}
              className="w-full h-auto object-contain max-h-[70vh]"
              onError={(e) => {
                console.error('Image failed to load:', idea.media_url);
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          )}
          
          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground">
            {idea.media_type === 'youtube' ? (
              <span className="flex items-center gap-1"><Youtube className="h-3 w-3" /> YouTube</span>
            ) : 'Image'}
          </Badge>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={idea.profiles?.avatar_url} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {(idea.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              {idea.profiles?.full_name || 'Anonymous'}
              {idea.profiles?.is_verified && <VerifiedBadge size="sm" />}
            </p>
            <p className="text-sm text-muted-foreground">@{idea.profiles?.username || 'anonymous'}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(idea.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Title & Description */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-3">{idea.title}</h2>
          {idea.description && (
            <p className="text-muted-foreground leading-relaxed mb-3">
              <LinkifiedText 
                text={idea.description} 
                linkClassName="text-primary hover:underline break-all"
              />
            </p>
          )}
          
          {/* View Count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Eye className="h-4 w-4" />
            <span className="text-sm">{idea.views_count.toLocaleString()} views</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between py-4 border-t border-border">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`gap-2 hover:text-red-500 transition-colors ${
                idea.is_liked ? 'text-red-500' : ''
              }`}
              onClick={handleLike}
            >
              <Heart className={`h-5 w-5 ${idea.is_liked ? 'fill-current' : ''}`} />
              <span>{idea.likes_count}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2" 
              onClick={() => {
                if (!user) {
                  setSignupPrompt({ open: true, action: 'comment on this video' });
                  return;
                }
                setCommentDialogOpen(true);
              }}
            >
              <MessageCircle className="h-5 w-5" />
              <span>{idea.comments_count}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <Share className="h-5 w-5" />
              <span>Share</span>
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className={`gap-2 hover:text-accent transition-colors ${
              idea.is_saved ? 'text-accent' : ''
            }`}
            onClick={handleSave}
          >
            <Bookmark className={`h-5 w-5 ${idea.is_saved ? 'fill-current' : ''}`} />
            <span>{idea.saves_count}</span>
          </Button>
        </div>
      </section>

      <CommentDialog
        open={commentDialogOpen}
        onOpenChange={setCommentDialogOpen}
        mediaId={idea.id}
        mediaTitle={idea.title}
      />
      
      <SignupPrompt
        open={signupPrompt.open}
        onOpenChange={(open) => setSignupPrompt({ ...signupPrompt, open })}
        action={signupPrompt.action}
      />
    </div>
  );
}