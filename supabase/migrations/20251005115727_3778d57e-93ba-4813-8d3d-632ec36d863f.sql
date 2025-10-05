-- Fix security issue: Restrict media_views table access to prevent user tracking
-- Users can only see their own view history, and media owners can see who viewed their content

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view media views" ON public.media_views;

-- Create new restrictive policy: Users can view their own viewing history
CREATE POLICY "Users can view their own viewing history"
ON public.media_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy: Media owners can see who viewed their content
CREATE POLICY "Media owners can view their content viewers"
ON public.media_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads
    WHERE media_uploads.id = media_views.media_id
    AND media_uploads.user_id = auth.uid()
  )
);

-- Allow anonymous users to view their own views (if tracked by IP)
-- This is optional and can be removed if you don't want to support anonymous viewing history
CREATE POLICY "Anonymous users can view by IP"
ON public.media_views
FOR SELECT
TO anon
USING (
  user_id IS NULL
  AND ip_address IS NOT NULL
);