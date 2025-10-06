import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share, Bookmark, Eye, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CommentDialog } from '@/components/CommentDialog';
import SignupPrompt from '@/components/SignupPrompt';
import { cn } from '@/lib/utils';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (id) {
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
          profiles:user_id (
            full_name,
            username,
            avatar_url
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
          profiles:user_id (
            full_name,
            username,
            avatar_url
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
          .select('likes_count')
          .eq('id', media.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: currentMedia.likes_count + 1 })
            .eq('id', media.id);
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
          .select('saves_count')
          .eq('id', media.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: currentMedia.saves_count + 1 })
            .eq('id', media.id);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="aspect-video bg-muted rounded-xl" />
        </div>
      </div>
    );
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

  const isVideo = media.media_type.startsWith('video/');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40 lg:hidden">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* YouTube-style layout */}
      <div className="lg:flex lg:gap-6 lg:px-6 lg:py-6 max-w-[1800px] mx-auto">
        {/* Main content - video and details */}
        <div className="lg:flex-1 lg:max-w-[1280px]">
          {/* Media - Full scale like YouTube */}
          <div className="relative bg-black rounded-xl overflow-hidden">
            {isVideo ? (
              <video 
                ref={videoRef}
                controls
                playsInline
                preload="auto"
                crossOrigin="anonymous"
                className="w-full aspect-video object-contain"
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
                className="w-full aspect-video object-contain"
                loading="eager"
              />
            )}
          </div>

          {/* Video details */}
          <div className="p-4 lg:p-6">
            <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-4">{media.title}</h1>

            {/* User info and actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-border">
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
                  <p className="font-semibold text-foreground">{media.profiles?.full_name || 'Anonymous'}</p>
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
                
                <Button variant="ghost" size="sm" className="gap-2">
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
              </div>
            </div>

            {/* Description and stats */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{media.views_count.toLocaleString()} views</span>
                </div>
                <span>{new Date(media.created_at).toLocaleDateString()}</span>
              </div>
              {media.description && (
                <p className="text-foreground leading-relaxed">{media.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations sidebar - scrollable like YouTube */}
        <aside className="lg:w-[402px] lg:max-h-screen lg:overflow-y-auto lg:pb-4 lg:pr-2">
          <div className="px-4 lg:px-0 pb-20 lg:pb-4">
            <h2 className="text-lg font-semibold mb-3 pt-4 lg:pt-0">Recommended</h2>
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex gap-2 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-all group"
                  onClick={() => {
                    navigate(`/video/${rec.id}`);
                    window.scrollTo(0, 0);
                  }}
                >
                  {/* Thumbnail - YouTube proportions (168x94) */}
                  <div className="relative w-[168px] h-[94px] flex-shrink-0 bg-muted rounded-lg overflow-hidden">
                    {rec.media_type.startsWith('video/') ? (
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
                    {/* Duration badge for videos */}
                    {rec.media_type.startsWith('video/') && (
                      <div className="absolute bottom-1 right-1 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                        Video
                      </div>
                    )}
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 rounded-full p-2">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Video info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-1">
                      {rec.profiles?.full_name || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{rec.views_count.toLocaleString()} views</span>
                      <span>•</span>
                      <span>{new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show message if no recommendations */}
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No recommendations available
                </div>
              )}
            </div>
          </div>
        </aside>
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
