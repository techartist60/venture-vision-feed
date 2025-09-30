-- Fix security warning: Set search_path for calculate_similarity_tier function
DROP FUNCTION IF EXISTS public.calculate_similarity_tier(DECIMAL);

CREATE OR REPLACE FUNCTION public.calculate_similarity_tier(score DECIMAL)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF score >= 85 THEN RETURN 'near_duplicate';
  ELSIF score >= 60 THEN RETURN 'strong';
  ELSIF score >= 30 THEN RETURN 'related';
  ELSE RETURN 'distant';
  END IF;
END;
$$;