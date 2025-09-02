import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share, Bookmark, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CommentDialog } from '@/components/CommentDialog';
import SignupPrompt from '@/components/SignupPrompt';

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
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
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
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [signupPrompt, setSignupPrompt] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  useEffect(() => {
    if (id) {
      fetchIdea();
    }
  }, [id, user]);

  const fetchIdea = async () => {
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

      // Auto-play video if it's a video
      if (data && data.media_type.startsWith('video/')) {
        setVideoPlaying(true);
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
          .select('likes_count')
          .eq('id', idea.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ likes_count: currentMedia.likes_count + 1 })
            .eq('id', idea.id);
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
          .select('saves_count')
          .eq('id', idea.id)
          .single();

        if (currentMedia) {
          await supabase
            .from('media_uploads')
            .update({ saves_count: currentMedia.saves_count + 1 })
            .eq('id', idea.id);
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

  return (
    <div className="min-h-screen bg-background">
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
        <div className="relative aspect-video bg-muted rounded-xl overflow-hidden mb-6">
          {idea.media_type.startsWith('image/') ? (
            <img 
              src={idea.media_url} 
              alt={idea.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="relative w-full h-full">
              <video 
                src={idea.media_url}
                controls
                autoPlay={videoPlaying}
                className="w-full h-full object-cover"
                poster={idea.thumbnail_url}
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
              />
            </div>
          )}
          
          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground">
            {idea.media_type.startsWith('video/') ? 'Video' : 'Image'}
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
            <p className="font-semibold text-foreground">{idea.profiles?.full_name || 'Anonymous'}</p>
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
            <p className="text-muted-foreground leading-relaxed">{idea.description}</p>
          )}
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