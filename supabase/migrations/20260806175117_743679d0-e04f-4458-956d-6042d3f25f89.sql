CREATE TABLE public.tech_news_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  source_name TEXT,
  source_url TEXT NOT NULL UNIQUE,
  published_for DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tech_news_posts_published_for_key ON public.tech_news_posts (published_for);

GRANT SELECT ON public.tech_news_posts TO anon;
GRANT SELECT ON public.tech_news_posts TO authenticated;
GRANT ALL ON public.tech_news_posts TO service_role;

ALTER TABLE public.tech_news_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tech news is publicly readable"
  ON public.tech_news_posts FOR SELECT
  USING (true);