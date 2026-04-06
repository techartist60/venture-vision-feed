
CREATE TABLE public.live_link_comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL REFERENCES public.live_link_comments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, comment_id)
);

ALTER TABLE public.live_link_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live link comment likes" ON public.live_link_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like live link comments" ON public.live_link_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike live link comments" ON public.live_link_comment_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_live_link_comment_likes(p_comment_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_link_comments SET likes_count = likes_count + 1 WHERE id = p_comment_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_live_link_comment_likes(p_comment_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
  UPDATE public.live_link_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = p_comment_id;
$$;
