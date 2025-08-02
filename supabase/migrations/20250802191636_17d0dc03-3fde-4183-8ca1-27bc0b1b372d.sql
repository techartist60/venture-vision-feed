-- Create media_comments table
CREATE TABLE public.media_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on media_comments
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for media_comments
CREATE POLICY "Anyone can view comments" 
ON public.media_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own comments" 
ON public.media_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.media_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to increment comment count
CREATE OR REPLACE FUNCTION public.increment_comment_count(media_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.media_uploads 
  SET comments_count = comments_count + 1 
  WHERE id = media_id;
$$;