-- Add views_count column to media_uploads table
ALTER TABLE public.media_uploads 
ADD COLUMN views_count integer NOT NULL DEFAULT 0;

-- Create media_views table to track unique views
CREATE TABLE public.media_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id uuid NOT NULL,
  user_id uuid NULL, -- NULL for anonymous users
  ip_address text NULL, -- For tracking anonymous views
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(media_id, user_id), -- Prevent duplicate views from same user
  UNIQUE(media_id, ip_address) -- Prevent duplicate views from same IP (for anonymous)
);

-- Enable RLS on media_views
ALTER TABLE public.media_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view media_views (for counting)
CREATE POLICY "Anyone can view media views" 
ON public.media_views 
FOR SELECT 
USING (true);

-- Allow anyone to insert media views (including anonymous users)
CREATE POLICY "Anyone can insert media views" 
ON public.media_views 
FOR INSERT 
WITH CHECK (true);

-- Create function to increment view count safely
CREATE OR REPLACE FUNCTION public.increment_view_count(media_id uuid, viewer_user_id uuid DEFAULT NULL, viewer_ip text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  view_exists boolean := false;
BEGIN
  -- Check if view already exists
  IF viewer_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.media_views 
      WHERE media_views.media_id = increment_view_count.media_id 
      AND user_id = viewer_user_id
    ) INTO view_exists;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.media_views 
      WHERE media_views.media_id = increment_view_count.media_id 
      AND ip_address = viewer_ip
    ) INTO view_exists;
  END IF;

  -- Only increment if view doesn't exist
  IF NOT view_exists THEN
    -- Insert the view record
    INSERT INTO public.media_views (media_id, user_id, ip_address)
    VALUES (increment_view_count.media_id, viewer_user_id, viewer_ip);
    
    -- Increment the counter
    UPDATE public.media_uploads 
    SET views_count = views_count + 1 
    WHERE id = increment_view_count.media_id;
  END IF;
END;
$$;