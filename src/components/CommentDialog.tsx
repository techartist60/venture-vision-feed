import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  };
}

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaId: string;
  mediaTitle: string;
}

export function CommentDialog({ open, onOpenChange, mediaId, mediaTitle }: CommentDialogProps) {
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
      // Simple query without joins for now
      const { data: commentsData, error } = await supabase
        .from('media_comments' as any)
        .select('*')
        .eq('media_id', mediaId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profiles for all users
      const userIds = [...new Set(commentsData?.map((c: any) => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', userIds);

      // Merge data
      const commentsWithProfiles = (commentsData || []).map((comment: any) => ({
        ...comment,
        profiles: profilesData?.find((p: any) => p.user_id === comment.user_id)
      }));

      setComments(commentsWithProfiles);
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
      // Add comment with proper casting
      const commentData = {
        media_id: mediaId,
        user_id: user.id,
        content: newComment.trim()
      };

      const { data, error } = await supabase
        .from('media_comments' as any)
        .insert(commentData)
        .select('*')
        .single();

      if (error) throw error;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      const newCommentWithProfile: Comment = {
        id: (data as any).id,
        content: (data as any).content,
        created_at: (data as any).created_at,
        user_id: (data as any).user_id,
        profiles: profile
      };

      setComments(prev => [...prev, newCommentWithProfile]);
      setNewComment('');
      
      // Update comment count in media_uploads
      const { data: currentMedia } = await supabase
        .from('media_uploads')
        .select('comments_count')
        .eq('id', mediaId)
        .maybeSingle();
        
      if (currentMedia) {
        await supabase
          .from('media_uploads')
          .update({ comments_count: currentMedia.comments_count + 1 })
          .eq('id', mediaId);
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
            <div className="text-center text-muted-foreground">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground">No comments yet. Be the first to comment!</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.profiles?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {(comment.profiles?.full_name || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.profiles?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground break-words">{comment.content}</p>
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