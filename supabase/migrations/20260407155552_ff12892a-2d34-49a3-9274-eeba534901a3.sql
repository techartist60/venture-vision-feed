
CREATE OR REPLACE FUNCTION public.increment_view_count(media_id uuid, viewer_user_id uuid DEFAULT NULL::uuid, viewer_ip text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  view_exists boolean := false;
BEGIN
  -- Only allow authenticated views now
  IF viewer_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if view already exists
  SELECT EXISTS(
    SELECT 1 FROM public.media_views 
    WHERE media_views.media_id = increment_view_count.media_id 
    AND user_id = viewer_user_id
  ) INTO view_exists;

  -- Only increment if view doesn't exist
  IF NOT view_exists THEN
    INSERT INTO public.media_views (media_id, user_id)
    VALUES (increment_view_count.media_id, viewer_user_id);
    
    UPDATE public.media_uploads 
    SET views_count = views_count + 1 
    WHERE id = increment_view_count.media_id;
  END IF;
END;
$function$;
