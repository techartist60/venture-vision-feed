-- 1. boost_payments: scope to authenticated only
DROP POLICY IF EXISTS "Users can view their own boost payments" ON public.boost_payments;
DROP POLICY IF EXISTS "Users can update their own boost payments" ON public.boost_payments;
DROP POLICY IF EXISTS "Users can create their own boost payments" ON public.boost_payments;

CREATE POLICY "Users can view their own boost payments"
ON public.boost_payments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own boost payments"
ON public.boost_payments FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own boost payments"
ON public.boost_payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. premium_subscriptions: scope to authenticated only
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.premium_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.premium_subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.premium_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions"
ON public.premium_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. watched_website_changes: only service role can insert
DROP POLICY IF EXISTS "System can insert changes" ON public.watched_website_changes;

CREATE POLICY "Service role can insert changes"
ON public.watched_website_changes FOR INSERT TO service_role
WITH CHECK (true);

-- 4. group_members: prevent self-elevation. Members added by creator/admin must
-- either be a different user, OR if it's the caller themselves, must be role='member'.
DROP POLICY IF EXISTS "Group creators and admins can add members" ON public.group_members;

CREATE POLICY "Group creators and admins can add members"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  (public.is_group_creator(group_id, auth.uid()) OR public.is_group_admin(group_id, auth.uid()))
  AND (
    user_id <> auth.uid()
    OR role = 'member'::group_role
  )
);

-- 5. Realtime channel authorization for followers and conversations
CREATE POLICY "Users subscribe to own follower events"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'followers:%'
  AND (
    (split_part(realtime.topic(), ':', 2))::uuid = auth.uid()
  )
);

CREATE POLICY "Users subscribe to own conversation events"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE 'conversations:%'
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = (split_part(realtime.topic(), ':', 2))::uuid
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
  )
);