CREATE TABLE public.pitch_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  idea_id UUID NULL,
  title TEXT NOT NULL,
  category TEXT NULL,
  target_audience TEXT NULL,
  monetization TEXT NULL,
  website_url TEXT NULL,
  image_url TEXT NULL,
  video_url TEXT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pitch_decks_user_id ON public.pitch_decks(user_id);
CREATE INDEX idx_pitch_decks_idea_id ON public.pitch_decks(idea_id);

ALTER TABLE public.pitch_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pitch decks"
  ON public.pitch_decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public pitch decks"
  ON public.pitch_decks FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create own pitch decks"
  ON public.pitch_decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pitch decks"
  ON public.pitch_decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pitch decks"
  ON public.pitch_decks FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_pitch_decks_updated_at
  BEFORE UPDATE ON public.pitch_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();