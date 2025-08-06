-- Create boost_payments table for tracking M-Pesa payments
CREATE TABLE public.boost_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  media_id UUID NOT NULL,
  amount INTEGER NOT NULL DEFAULT 10000, -- 100 KES in cents
  phone_number TEXT NOT NULL,
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mpesa_receipt_number TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boost_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own boost payments" 
ON public.boost_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boost payments" 
ON public.boost_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boost payments" 
ON public.boost_payments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_boost_payments_updated_at
BEFORE UPDATE ON public.boost_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add boosted status to media_uploads
ALTER TABLE public.media_uploads 
ADD COLUMN is_boosted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN boost_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX idx_boost_payments_user_id ON public.boost_payments(user_id);
CREATE INDEX idx_boost_payments_status ON public.boost_payments(status);
CREATE INDEX idx_media_uploads_boosted ON public.media_uploads(is_boosted) WHERE is_boosted = true;