-- Create Idescan tables for storing scans, innovation records, and results

-- Table to store user scans
CREATE TABLE public.idescan_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to store innovation records from various sources
CREATE TABLE public.innovation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  country TEXT,
  source_type TEXT NOT NULL, -- idestrim, patent, news, startup
  source_url TEXT,
  legal_status TEXT,
  patent_number TEXT,
  publication_date DATE,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to store scan results (matches)
CREATE TABLE public.scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.idescan_scans(id) ON DELETE CASCADE NOT NULL,
  innovation_id UUID REFERENCES public.innovation_records(id) ON DELETE CASCADE NOT NULL,
  similarity_score DECIMAL(5,2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 100),
  similarity_tier TEXT NOT NULL CHECK (similarity_tier IN ('distant', 'related', 'strong', 'near_duplicate')),
  text_similarity DECIMAL(5,2),
  image_similarity DECIMAL(5,2),
  metadata_similarity DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.idescan_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innovation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for idescan_scans
CREATE POLICY "Users can view their own scans"
  ON public.idescan_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scans"
  ON public.idescan_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
  ON public.idescan_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans"
  ON public.idescan_scans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for innovation_records (public read, admin write)
CREATE POLICY "Anyone can view innovation records"
  ON public.innovation_records FOR SELECT
  USING (true);

-- RLS Policies for scan_results (users can only see results for their scans)
CREATE POLICY "Users can view results for their scans"
  ON public.scan_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.idescan_scans
      WHERE idescan_scans.id = scan_results.scan_id
      AND idescan_scans.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_scans_user_id ON public.idescan_scans(user_id);
CREATE INDEX idx_scans_status ON public.idescan_scans(status);
CREATE INDEX idx_scans_created_at ON public.idescan_scans(created_at DESC);

CREATE INDEX idx_innovation_records_source_type ON public.innovation_records(source_type);
CREATE INDEX idx_innovation_records_tags ON public.innovation_records USING GIN(tags);

CREATE INDEX idx_scan_results_scan_id ON public.scan_results(scan_id);
CREATE INDEX idx_scan_results_innovation_id ON public.scan_results(innovation_id);
CREATE INDEX idx_scan_results_similarity_score ON public.scan_results(similarity_score DESC);

-- Create storage bucket for scan uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('idescan-uploads', 'idescan-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for uploads
CREATE POLICY "Users can upload their own scan images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'idescan-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own scan images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'idescan-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own scan images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'idescan-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_scans_updated_at
  BEFORE UPDATE ON public.idescan_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_innovation_records_updated_at
  BEFORE UPDATE ON public.innovation_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();