-- Add investment-related columns to media_uploads table
ALTER TABLE public.media_uploads
ADD COLUMN investment_status text DEFAULT 'normal' CHECK (investment_status IN ('open', 'normal')),
ADD COLUMN funding_amount integer,
ADD COLUMN investment_stage text CHECK (investment_stage IN ('concept', 'prototype', 'ready')),
ADD COLUMN pitch_summary text;

-- Add comment for clarity
COMMENT ON COLUMN public.media_uploads.investment_status IS 'Investment status: open for investment or normal post';
COMMENT ON COLUMN public.media_uploads.funding_amount IS 'Requested funding amount in KES';
COMMENT ON COLUMN public.media_uploads.investment_stage IS 'Investment stage: concept, prototype, or ready';
COMMENT ON COLUMN public.media_uploads.pitch_summary IS 'Short pitch summary for investors';

-- Create index for faster queries on investment_ready posts
CREATE INDEX idx_media_uploads_investment_status ON public.media_uploads(investment_status) WHERE investment_status = 'open';

-- Create a function to get investment-ready post count for a user
CREATE OR REPLACE FUNCTION public.get_investment_ready_count(profile_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.media_uploads
  WHERE user_id = profile_user_id AND investment_status = 'open';
$$;