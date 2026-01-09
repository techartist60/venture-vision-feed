-- Create watched_websites table to store pinned websites for monitoring
CREATE TABLE public.watched_websites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES public.idescan_scans(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  similarity_score INTEGER DEFAULT 0,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_content_hash TEXT,
  update_status TEXT DEFAULT 'no_change',
  is_pinned BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create watched_website_changes table to track changes over time
CREATE TABLE public.watched_website_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  watched_website_id UUID NOT NULL REFERENCES public.watched_websites(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- 'content', 'pricing', 'features', 'pages'
  change_summary TEXT NOT NULL,
  previous_content TEXT,
  new_content TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_subscription_tiers table for premium features
CREATE TABLE public.user_subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  max_watched_websites INTEGER DEFAULT 10,
  scan_frequency TEXT DEFAULT 'weekly', -- 'weekly', 'daily'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.watched_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watched_website_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Policies for watched_websites
CREATE POLICY "Users can view their own watched websites"
ON public.watched_websites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watched websites"
ON public.watched_websites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watched websites"
ON public.watched_websites FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watched websites"
ON public.watched_websites FOR DELETE
USING (auth.uid() = user_id);

-- Policies for watched_website_changes
CREATE POLICY "Users can view changes for their watched websites"
ON public.watched_website_changes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.watched_websites 
    WHERE id = watched_website_id AND user_id = auth.uid()
  )
);

CREATE POLICY "System can insert changes"
ON public.watched_website_changes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.watched_websites 
    WHERE id = watched_website_id AND user_id = auth.uid()
  )
);

-- Policies for user_subscription_tiers
CREATE POLICY "Users can view their own subscription"
ON public.user_subscription_tiers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscription_tiers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscription_tiers FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_watched_websites_user_id ON public.watched_websites(user_id);
CREATE INDEX idx_watched_websites_scan_id ON public.watched_websites(scan_id);
CREATE INDEX idx_watched_website_changes_watched_id ON public.watched_website_changes(watched_website_id);
CREATE INDEX idx_user_subscription_tiers_user_id ON public.user_subscription_tiers(user_id);

-- Add trigger for updating updated_at
CREATE TRIGGER update_watched_websites_updated_at
BEFORE UPDATE ON public.watched_websites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscription_tiers_updated_at
BEFORE UPDATE ON public.user_subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();