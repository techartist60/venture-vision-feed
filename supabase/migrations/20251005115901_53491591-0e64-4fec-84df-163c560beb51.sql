-- Fix security issue: Restrict media_saves table access to prevent user interest profiling
-- Users can only see their own saves, and media owners can see who saved their content

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view saves" ON public.media_saves;

-- Create new restrictive policy: Users can view their own saves
CREATE POLICY "Users can view their own saves"
ON public.media_saves
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy: Media owners can see who saved their content (for analytics)
CREATE POLICY "Media owners can view who saved their content"
ON public.media_saves
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads
    WHERE media_uploads.id = media_saves.media_id
    AND media_uploads.user_id = auth.uid()
  )
);