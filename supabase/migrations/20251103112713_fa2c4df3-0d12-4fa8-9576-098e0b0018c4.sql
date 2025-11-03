-- Fix ambiguous column reference in create_notification function
CREATE OR REPLACE FUNCTION public.create_notification(
  recipient_id UUID,
  actor_id UUID,
  notification_type TEXT,
  media_id UUID DEFAULT NULL,
  comment_content TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Don't create notification if user is acting on their own content
  IF recipient_id = actor_id THEN
    RETURN;
  END IF;

  -- For follow notifications, check if notification already exists
  IF notification_type = 'follow' THEN
    IF EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE notifications.user_id = create_notification.recipient_id 
        AND notifications.actor_id = create_notification.actor_id 
        AND notifications.type = 'follow'
        AND notifications.created_at > NOW() - INTERVAL '1 day'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, media_id, content)
  VALUES (recipient_id, actor_id, notification_type, media_id, comment_content);
END;
$$;