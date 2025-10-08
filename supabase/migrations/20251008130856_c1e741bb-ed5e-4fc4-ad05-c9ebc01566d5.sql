-- Create table to track unlocked innovation details
CREATE TABLE IF NOT EXISTS public.unlocked_innovations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  innovation_id UUID NOT NULL REFERENCES public.innovation_records(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.idescan_scans(id) ON DELETE CASCADE,
  payment_reference TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, innovation_id)
);

-- Enable RLS
ALTER TABLE public.unlocked_innovations ENABLE ROW LEVEL SECURITY;

-- Users can view their own unlocked innovations
CREATE POLICY "Users can view their own unlocked innovations"
ON public.unlocked_innovations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own unlocked innovations
CREATE POLICY "Users can insert their own unlocked innovations"
ON public.unlocked_innovations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_unlocked_innovations_user_innovation 
ON public.unlocked_innovations(user_id, innovation_id);