-- Create table for premium subscriptions (both WebScan and Idemark)
CREATE TABLE public.premium_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('webscan_premium', 'idemark_premium')),
  amount NUMERIC NOT NULL DEFAULT 10.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  payment_reference TEXT,
  intasend_invoice_id TEXT,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  api_key TEXT, -- For WebScan integration keys
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions" 
ON public.premium_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" 
ON public.premium_subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update subscriptions" 
ON public.premium_subscriptions 
FOR UPDATE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_premium_subscriptions_updated_at
BEFORE UPDATE ON public.premium_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_premium_subscriptions_user_id ON public.premium_subscriptions(user_id);
CREATE INDEX idx_premium_subscriptions_plan_type ON public.premium_subscriptions(plan_type);
CREATE INDEX idx_premium_subscriptions_status ON public.premium_subscriptions(status);