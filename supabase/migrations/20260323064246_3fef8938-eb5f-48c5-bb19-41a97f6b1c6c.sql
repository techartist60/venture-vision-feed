
-- Fix: Allow 'youtube' media type in media_uploads
ALTER TABLE public.media_uploads DROP CONSTRAINT media_uploads_media_type_check;
ALTER TABLE public.media_uploads ADD CONSTRAINT media_uploads_media_type_check CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'text'::text, 'youtube'::text]));
