-- Drop the existing constraint and add a new one that includes 'text' as a valid media type
ALTER TABLE public.media_uploads 
DROP CONSTRAINT media_uploads_media_type_check;

ALTER TABLE public.media_uploads 
ADD CONSTRAINT media_uploads_media_type_check 
CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'text'::text]));