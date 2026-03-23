
-- Create live_links table for website uploads (Try It Now feature)
CREATE TABLE public.live_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  website_url text NOT NULL,
  category text,
  thumbnail_url text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view live links" ON public.live_links FOR SELECT USING (true);
CREATE POLICY "Users can create their own live links" ON public.live_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own live links" ON public.live_links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own live links" ON public.live_links FOR DELETE USING (auth.uid() = user_id);
