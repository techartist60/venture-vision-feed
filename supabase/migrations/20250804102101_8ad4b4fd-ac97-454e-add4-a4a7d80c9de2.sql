-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- The user who will receive the notification
  actor_id UUID NOT NULL, -- The user who performed the action
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow')),
  media_id UUID, -- Only for like and comment notifications
  content TEXT, -- For comment notifications, store the comment content
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to create notification
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
      WHERE user_id = recipient_id 
        AND actor_id = actor_id 
        AND type = 'follow'
        AND created_at > NOW() - INTERVAL '1 day'
    ) THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, media_id, content)
  VALUES (recipient_id, actor_id, notification_type, media_id, comment_content);
END;
$$;

-- Create trigger function for likes
CREATE OR REPLACE FUNCTION public.notify_media_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  media_owner_id UUID;
BEGIN
  -- Get the owner of the media
  SELECT user_id INTO media_owner_id
  FROM public.media_uploads
  WHERE id = NEW.media_id;

  -- Create notification
  PERFORM public.create_notification(
    media_owner_id,
    NEW.user_id,
    'like',
    NEW.media_id
  );

  RETURN NEW;
END;
$$;

-- Create trigger function for comments
CREATE OR REPLACE FUNCTION public.notify_media_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  media_owner_id UUID;
BEGIN
  -- Get the owner of the media
  SELECT user_id INTO media_owner_id
  FROM public.media_uploads
  WHERE id = NEW.media_id;

  -- Create notification
  PERFORM public.create_notification(
    media_owner_id,
    NEW.user_id,
    'comment',
    NEW.media_id,
    NEW.content
  );

  RETURN NEW;
END;
$$;

-- Create trigger function for follows
CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create notification
  PERFORM public.create_notification(
    NEW.following_id,
    NEW.follower_id,
    'follow'
  );

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_notify_like
  AFTER INSERT ON public.media_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_media_like();

CREATE TRIGGER trigger_notify_comment
  AFTER INSERT ON public.media_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_media_comment();

CREATE TRIGGER trigger_notify_follow
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_follow();