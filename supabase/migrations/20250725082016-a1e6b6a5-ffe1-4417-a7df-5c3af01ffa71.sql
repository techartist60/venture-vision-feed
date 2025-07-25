-- Create followers table for user relationships
CREATE TABLE public.followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

-- Create policies for followers
CREATE POLICY "Anyone can view followers" 
ON public.followers 
FOR SELECT 
USING (true);

CREATE POLICY "Users can follow others" 
ON public.followers 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others" 
ON public.followers 
FOR DELETE 
USING (auth.uid() = follower_id);

-- Create media uploads table for discovery feed
CREATE TABLE public.media_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for media uploads
CREATE POLICY "Anyone can view media uploads" 
ON public.media_uploads 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own media uploads" 
ON public.media_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own media uploads" 
ON public.media_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media uploads" 
ON public.media_uploads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_media_uploads_updated_at
BEFORE UPDATE ON public.media_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create likes table for media interactions
CREATE TABLE public.media_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_uploads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Enable RLS
ALTER TABLE public.media_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for media likes
CREATE POLICY "Anyone can view likes" 
ON public.media_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like media" 
ON public.media_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike media" 
ON public.media_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create helper functions for counts
CREATE OR REPLACE FUNCTION public.get_follower_count(profile_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.followers
  WHERE following_id = profile_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_following_count(profile_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.followers
  WHERE follower_id = profile_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_media_count(profile_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.media_uploads
  WHERE user_id = profile_user_id;
$$;