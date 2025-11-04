-- Remove the IP-based SELECT policy that allows tracking
DROP POLICY IF EXISTS "Anonymous users can view by IP" ON public.media_views;

-- The remaining policies are secure:
-- 1. "Media owners can view their content viewers" - allows media owners to see who viewed their content
-- 2. "Users can view their own viewing history" - allows users to see their own views
-- 3. "Anyone can insert media views" - allows tracking views (necessary for functionality)

-- This ensures IP addresses are only accessible to:
-- - Media owners (to see who viewed their content)
-- - System administrators (via service role)
-- But NOT to arbitrary users who could track individuals by IP address