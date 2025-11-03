-- Add category column to media_uploads table
ALTER TABLE public.media_uploads 
ADD COLUMN IF NOT EXISTS category text;

-- Create an index on category for better query performance
CREATE INDEX IF NOT EXISTS idx_media_uploads_category ON public.media_uploads(category);