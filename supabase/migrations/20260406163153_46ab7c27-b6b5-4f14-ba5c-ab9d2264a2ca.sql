-- Fix overly permissive UPDATE policies on subscription tables
DROP POLICY IF EXISTS "Service role can update subscriptions" ON webscan_subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON premium_subscriptions;

-- Add narrow policies so users can only cancel their own subscriptions
CREATE POLICY "Users can cancel own webscan subscription"
ON webscan_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE POLICY "Users can cancel own premium subscription"
ON premium_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');