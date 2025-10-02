-- Add metadata column to idescan_scans table for storing clustering information
ALTER TABLE public.idescan_scans
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;