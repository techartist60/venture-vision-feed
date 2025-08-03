-- Create media_saves table for save functionality
CREATE TABLE public.media_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Enable RLS
ALTER TABLE public.media_saves ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view saves" 
ON public.media_saves 
FOR SELECT 
USING (true);

CREATE POLICY "Users can save media" 
ON public.media_saves 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave media" 
ON public.media_saves 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add saves_count column to media_uploads
ALTER TABLE public.media_uploads 
ADD COLUMN saves_count INTEGER NOT NULL DEFAULT 0;

-- Create function to update saves count
CREATE OR REPLACE FUNCTION public.increment_saves_count(media_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.media_uploads 
  SET saves_count = saves_count + 1 
  WHERE id = media_id;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_saves_count(media_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.media_uploads 
  SET saves_count = GREATEST(saves_count - 1, 0)
  WHERE id = media_id;
$function$;