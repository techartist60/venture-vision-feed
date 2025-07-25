-- Fix security warnings for function search paths
DROP FUNCTION IF EXISTS public.get_follower_count(UUID);
DROP FUNCTION IF EXISTS public.get_following_count(UUID);
DROP FUNCTION IF EXISTS public.get_media_count(UUID);

-- Recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.get_follower_count(profile_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.followers
  WHERE following_id = profile_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_following_count(profile_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.followers
  WHERE follower_id = profile_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_media_count(profile_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.media_uploads
  WHERE user_id = profile_user_id;
$$;