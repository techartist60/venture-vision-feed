-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to store vector representations
ALTER TABLE public.innovation_records
ADD COLUMN IF NOT EXISTS text_embedding vector(1536),
ADD COLUMN IF NOT EXISTS image_embedding vector(512);

ALTER TABLE public.idescan_scans
ADD COLUMN IF NOT EXISTS text_embedding vector(1536),
ADD COLUMN IF NOT EXISTS image_embedding vector(512);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_innovation_text_embedding 
ON public.innovation_records 
USING ivfflat (text_embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_innovation_image_embedding 
ON public.innovation_records 
USING ivfflat (image_embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to calculate weighted similarity score
CREATE OR REPLACE FUNCTION public.calculate_similarity_tier(score DECIMAL)
RETURNS TEXT AS $$
BEGIN
  IF score >= 85 THEN RETURN 'near_duplicate';
  ELSIF score >= 60 THEN RETURN 'strong';
  ELSIF score >= 30 THEN RETURN 'related';
  ELSE RETURN 'distant';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;