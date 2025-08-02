-- Create comments table for media uploads
CREATE TABLE public.media_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Anyone can view comments" 
ON public.media_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own comments" 
ON public.media_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.media_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.media_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_media_comments_updated_at
BEFORE UPDATE ON public.media_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to increment comment count
CREATE OR REPLACE FUNCTION public.increment_comment_count(media_id UUID)
RETURNS void
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.media_uploads 
  SET comments_count = comments_count + 1 
  WHERE id = media_id;
$$;