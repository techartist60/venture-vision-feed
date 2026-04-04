
-- Create live_link_likes table
CREATE TABLE public.live_link_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  live_link_id uuid NOT NULL REFERENCES public.live_links(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, live_link_id)
);

ALTER TABLE public.live_link_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live link likes" ON public.live_link_likes FOR SELECT USING (true);
CREATE POLICY "Users can like live links" ON public.live_link_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike live links" ON public.live_link_likes FOR DELETE USING (auth.uid() = user_id);

-- Create live_link_comments table
CREATE TABLE public.live_link_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  live_link_id uuid NOT NULL REFERENCES public.live_links(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.live_link_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live link comments" ON public.live_link_comments FOR SELECT USING (true);
CREATE POLICY "Users can create live link comments" ON public.live_link_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own live link comments" ON public.live_link_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own live link comments" ON public.live_link_comments FOR DELETE USING (auth.uid() = user_id);

-- Create live_link_saves table
CREATE TABLE public.live_link_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  live_link_id uuid NOT NULL REFERENCES public.live_links(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, live_link_id)
);

ALTER TABLE public.live_link_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own live link saves" ON public.live_link_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save live links" ON public.live_link_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave live links" ON public.live_link_saves FOR DELETE USING (auth.uid() = user_id);

-- Helper functions for live link counts
CREATE OR REPLACE FUNCTION public.increment_live_link_likes(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_links SET likes_count = likes_count + 1 WHERE id = link_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_live_link_likes(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_links SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = link_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_live_link_comments(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_links SET comments_count = comments_count + 1 WHERE id = link_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_live_link_saves(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_links SET saves_count = saves_count + 1 WHERE id = link_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_live_link_saves(link_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_links SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = link_id;
$$;
