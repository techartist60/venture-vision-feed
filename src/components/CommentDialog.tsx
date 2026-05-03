import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createNotification, getMediaOwnerId } from '@/utils/notifications';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  likes_count: number;
  is_liked?: boolean;
}

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaId: string;
  mediaTitle: string;
  source?: 'media_uploads' | 'live_links';
}

export function CommentDialog({ open, onOpenChange, mediaId, mediaTitle, source = 'media_uploads' }: CommentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && mediaId) {
      fetchComments();
    }
  }, [open, mediaId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const isLiveLink = source === 'live_links';

      let commentsData: any[] | null = null;
      let commentsError: any = null;

      if (isLiveLink) {
        const res = await supabase
          .from('live_link_comments')
          .select('*')
          .eq('live_link_id', mediaId)
          .order('created_at', { ascending: true });
        commentsData = res.data;
        commentsError = res.error;
      } else {
        const res = await supabase
          .from('media_comments')
          .select('*')
          .eq('media_id', mediaId)
          .order('created_at', { ascending: true });
        commentsData = res.data;
        commentsError = res.error;
      }

      if (commentsError) throw commentsError;

      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      let likedComments: string[] = [];
      if (user && commentsData && commentsData.length > 0) {
        const commentIds = commentsData.map(c => c.id);
        if (isLiveLink) {
          const { data: likesData } = await supabase
            .from('live_link_comment_likes')
            .select('comment_id')
            .eq('user_id', user.id)
            .in('comment_id', commentIds);
          likedComments = likesData?.map(l => l.comment_id) || [];
        } else {
          const { data: likesData } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('user_id', user.id)
            .in('comment_id', commentIds);
          likedComments = likesData?.map(l => l.comment_id) || [];
        }
      }

      const commentsWithUsers = commentsData?.map(comment => {
        const profile = profilesData?.find(p => p.user_id === comment.user_id);
        return {
          ...comment,
          user_name: profile?.full_name || 'Anonymous',
          user_avatar: profile?.avatar_url || '',
          is_liked: likedComments.includes(comment.id)
        };
      }) || [];

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const isLiveLink = source === 'live_links';
      let commentData: any;

      if (isLiveLink) {
        const { data, error } = await supabase
          .from('live_link_comments')
          .insert({ live_link_id: mediaId, user_id: user.id, content: newComment.trim() })
          .select()
          .single();
        if (error) throw error;
        commentData = data;
      } else {
        const { data, error } = await supabase
          .from('media_comments')
          .insert({ media_id: mediaId, user_id: user.id, content: newComment.trim() })
          .select()
          .single();
        if (error) throw error;
        commentData = data;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      const newCommentWithUser = {
        ...commentData,
        user_name: profileData?.full_name || 'Anonymous',
        user_avatar: profileData?.avatar_url || '',
        is_liked: false
      };

      setComments(prev => [...prev, newCommentWithUser]);
      setNewComment('');
      
      // Update comment count
      if (isLiveLink) {
        await supabase.rpc('increment_live_link_comments', { link_id: mediaId });
      } else {
        await supabase.rpc('increment_comment_count', { media_id: mediaId });
      }

      // Create notification for the owner
      if (!isLiveLink) {
        const ownerId = await getMediaOwnerId(mediaId);
        if (ownerId && user) {
          await createNotification({
            recipientId: ownerId,
            actorId: user.id,
            type: 'comment',
            mediaId: mediaId,
            commentContent: newComment.trim().substring(0, 100)
          });
        }
      } else {
        // For live links, get owner from live_links table
        const { data: linkData } = await supabase
          .from('live_links')
          .select('user_id')
          .eq('id', mediaId)
          .maybeSingle();
        if (linkData && linkData.user_id !== user.id) {
          await createNotification({
            recipientId: linkData.user_id,
            actorId: user.id,
            type: 'comment',
            commentContent: newComment.trim().substring(0, 100)
          });
        }
      }

      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like comments",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { 
            ...comment, 
            is_liked: !isLiked,
            likes_count: isLiked ? comment.likes_count - 1 : comment.likes_count + 1
          }
        : comment
    ));

    const isLiveLink = source === 'live_links';
    try {
      if (isLiked) {
        if (isLiveLink) {
          const { error: deleteError } = await supabase
            .from('live_link_comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
          if (deleteError) throw deleteError;
          await supabase.rpc('decrement_live_link_comment_likes', { p_comment_id: commentId });
        } else {
          const { error: deleteError } = await supabase
            .from('comment_likes')
            .delete()
            .eq('comment_id', commentId)
            .eq('user_id', user.id);
          if (deleteError) throw deleteError;
          await supabase.rpc('decrement_comment_likes_count', { comment_id: commentId });
        }
      } else {
        if (isLiveLink) {
          const { error: insertError } = await supabase
            .from('live_link_comment_likes')
            .insert({ comment_id: commentId, user_id: user.id });
          if (insertError) throw insertError;
          await supabase.rpc('increment_live_link_comment_likes', { p_comment_id: commentId });
        } else {
          const { error: insertError } = await supabase
            .from('comment_likes')
            .insert({ comment_id: commentId, user_id: user.id });
          if (insertError) throw insertError;
          await supabase.rpc('increment_comment_likes_count', { comment_id: commentId });
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              is_liked: isLiked,
              likes_count: isLiked ? comment.likes_count + 1 : comment.likes_count - 1
            }
          : comment
      ));
      
      console.error('Error toggling comment like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">Comments</DialogTitle>
          <p className="text-sm text-muted-foreground line-clamp-1">{mediaTitle}</p>
        </DialogHeader>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              {(() => { const { AtomLoader } = require('@/components/ui/AtomLoader'); return <AtomLoader size={56} label="Loading comments..." />; })()}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground">No comments yet. Be the first to comment!</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.user_avatar} />
                  <AvatarFallback className="text-xs">
                    {(comment.user_name || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.user_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground break-words mb-2">{comment.content}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1.5"
                    onClick={() => handleCommentLike(comment.id, comment.is_liked || false)}
                  >
                    <Heart 
                      className={`h-3.5 w-3.5 ${comment.is_liked ? 'fill-primary text-primary' : ''}`} 
                    />
                    <span className="text-xs">{comment.likes_count || 0}</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        {user && (
          <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 min-h-[80px] resize-none"
              disabled={submitting}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!newComment.trim() || submitting}
              className="h-[80px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}