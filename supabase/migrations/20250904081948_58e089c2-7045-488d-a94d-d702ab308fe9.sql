-- Create function to get video count for a user
CREATE OR REPLACE FUNCTION public.get_video_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.media_uploads
  WHERE user_id = profile_user_id AND media_type = 'video';
$function$;

-- Create function to get total likes count for a user's content
CREATE OR REPLACE FUNCTION public.get_total_likes_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(SUM(likes_count), 0)::INTEGER
  FROM public.media_uploads
  WHERE user_id = profile_user_id;
$function$;

-- Create trigger function to notify on new media upload
CREATE OR REPLACE FUNCTION public.notify_media_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  follower_record RECORD;
BEGIN
  -- Notify all followers of the user about the new upload
  FOR follower_record IN 
    SELECT follower_id 
    FROM public.followers 
    WHERE following_id = NEW.user_id
  LOOP
    PERFORM public.create_notification(
      follower_record.follower_id,
      NEW.user_id,
      'upload',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger for new media uploads
DROP TRIGGER IF EXISTS on_media_upload ON public.media_uploads;
CREATE TRIGGER on_media_upload
  AFTER INSERT ON public.media_uploads
  FOR EACH ROW EXECUTE FUNCTION public.notify_media_upload();