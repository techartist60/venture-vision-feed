-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

-- Create new SELECT policy that also allows group creators to view members
CREATE POLICY "Users can view members of their groups" ON public.group_members
FOR SELECT
USING (
  is_group_member(group_id, auth.uid())
  OR is_group_creator(group_id, auth.uid())
);

-- Also update INSERT policy to allow self-insertion as first member
DROP POLICY IF EXISTS "Group creators and admins can add members" ON public.group_members;

CREATE POLICY "Group creators and admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (
  -- Group creators can add anyone (including themselves as first member)
  is_group_creator(group_id, auth.uid())
  -- Existing admins can add new members
  OR is_group_admin(group_id, auth.uid())
  -- Allow users to add themselves if explicitly added by creator in the same transaction
  OR (auth.uid() = user_id AND is_group_creator(group_id, auth.uid()))
);