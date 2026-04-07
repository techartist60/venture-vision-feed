
-- 1. Fix boost_payments: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Users can create their own boost payments" ON boost_payments;
CREATE POLICY "Users can create their own boost payments"
ON boost_payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Fix media_views: restrict INSERT to authenticated users, remove IP tracking
DROP POLICY IF EXISTS "Anyone can insert media views" ON media_views;
CREATE POLICY "Authenticated users can insert media views"
ON media_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Drop ip_address column to eliminate privacy concern
ALTER TABLE media_views DROP COLUMN IF EXISTS ip_address;

-- 3. Fix group_members: block UPDATE entirely to prevent role escalation
CREATE POLICY "No one can update group member roles"
ON group_members FOR UPDATE TO authenticated
USING (false)
WITH CHECK (false);

-- 4. Restrict likes tables SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view comment likes" ON comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON comment_likes FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view likes" ON media_likes;
CREATE POLICY "Authenticated users can view likes"
ON media_likes FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view live link comment likes" ON live_link_comment_likes;
CREATE POLICY "Authenticated users can view live link comment likes"
ON live_link_comment_likes FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view live link likes" ON live_link_likes;
CREATE POLICY "Authenticated users can view live link likes"
ON live_link_likes FOR SELECT TO authenticated
USING (true);
