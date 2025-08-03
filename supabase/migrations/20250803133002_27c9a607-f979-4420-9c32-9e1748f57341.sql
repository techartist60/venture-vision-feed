-- Create functions to manage likes count
CREATE OR REPLACE FUNCTION public.increment_likes_count(media_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.media_uploads 
  SET likes_count = likes_count + 1 
  WHERE id = media_id;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_likes_count(media_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.media_uploads 
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = media_id;
$function$;