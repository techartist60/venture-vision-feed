-- Allow group creators to add members (including themselves) without being a member first
DROP POLICY IF EXISTS "Group creators and admins can add members" ON public.group_members;

CREATE POLICY "Group creators and admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (
  is_group_creator(group_id, auth.uid())
  OR is_group_admin(group_id, auth.uid())
);

-- Update SELECT policy to allow creators to see members even before joining
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

CREATE POLICY "Users can view members of their groups" ON public.group_members
FOR SELECT
USING (
  is_group_member(group_id, auth.uid())
  OR is_group_creator(group_id, auth.uid())
);