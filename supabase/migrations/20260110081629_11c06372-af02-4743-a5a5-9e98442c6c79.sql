-- Create webscan_subscriptions table for tracking premium access
CREATE TABLE public.webscan_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scan_id UUID REFERENCES public.idescan_scans(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('weekly', 'monthly')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  payment_reference TEXT NOT NULL UNIQUE,
  paystack_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_webscan_subs_user_id ON public.webscan_subscriptions(user_id);
CREATE INDEX idx_webscan_subs_scan_id ON public.webscan_subscriptions(scan_id);
CREATE INDEX idx_webscan_subs_status ON public.webscan_subscriptions(status);
CREATE INDEX idx_webscan_subs_expires_at ON public.webscan_subscriptions(expires_at);

-- Enable Row Level Security
ALTER TABLE public.webscan_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscriptions" 
ON public.webscan_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.webscan_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update subscriptions" 
ON public.webscan_subscriptions 
FOR UPDATE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_webscan_subscriptions_updated_at
BEFORE UPDATE ON public.webscan_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();