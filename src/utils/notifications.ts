import { supabase } from '@/integrations/supabase/client';

/**
 * Create a notification for various user actions
 * Uses the create_notification database function
 */
export async function createNotification({
  recipientId,
  actorId,
  type,
  mediaId,
  commentContent
}: {
  recipientId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow' | 'save' | 'message';
  mediaId?: string;
  commentContent?: string;
}) {
  // Don't notify yourself
  if (recipientId === actorId) {
    return { success: true, skipped: true };
  }

  try {
    const { error } = await supabase.rpc('create_notification', {
      recipient_id: recipientId,
      actor_id: actorId,
      notification_type: type,
      media_id: mediaId || null,
      comment_content: commentContent || null
    });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

/**
 * Get media owner ID for notification purposes
 */
export async function getMediaOwnerId(mediaId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('media_uploads')
      .select('user_id')
      .eq('id', mediaId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error('Error getting media owner:', error);
    return null;
  }
}
