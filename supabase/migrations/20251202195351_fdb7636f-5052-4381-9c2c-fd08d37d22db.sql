-- Create idemark_records table
CREATE TABLE public.idemark_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_id UUID REFERENCES public.media_uploads(id) ON DELETE SET NULL,
  idemark_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  fingerprint_hash TEXT NOT NULL,
  marked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_title_public BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_idemark_records_user_id ON public.idemark_records(user_id);
CREATE INDEX idx_idemark_records_idemark_id ON public.idemark_records(idemark_id);
CREATE INDEX idx_idemark_records_media_id ON public.idemark_records(media_id);

-- Enable RLS
ALTER TABLE public.idemark_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view active idemark records (for verification)
CREATE POLICY "Anyone can view active idemark records for verification"
ON public.idemark_records
FOR SELECT
USING (status = 'active');

-- Users can create their own idemark records
CREATE POLICY "Users can create their own idemark records"
ON public.idemark_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own idemark records
CREATE POLICY "Users can update their own idemark records"
ON public.idemark_records
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own idemark records
CREATE POLICY "Users can delete their own idemark records"
ON public.idemark_records
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_idemark_records_updated_at
BEFORE UPDATE ON public.idemark_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();