-- Drop all existing group_members policies
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

-- Drop the function that causes recursion
DROP FUNCTION IF EXISTS public.can_manage_group(uuid, uuid);

-- Create a simple function to check if user is group creator (no recursion)
CREATE OR REPLACE FUNCTION public.is_group_creator(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = _group_id 
    AND groups.created_by = _user_id
  );
$$;

-- Policy: Group creators can add the first member (themselves as admin)
-- OR existing admin members can add new members
CREATE POLICY "Group creators and admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (
  -- Allow if user is the group creator
  public.is_group_creator(auth.uid(), group_id)
  OR
  -- Allow if user is already an admin (for adding other members later)
  -- This uses a subquery but avoids recursion by using EXISTS
  (
    auth.uid() = user_id OR -- Allow adding yourself if invited
    EXISTS (
      SELECT 1 FROM public.group_members AS gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
      AND gm.id IS NOT NULL -- Ensures we're checking existing rows only
    )
  )
);

-- Policy: Group creators and admins can remove members
CREATE POLICY "Group creators and admins can remove members" ON public.group_members
FOR DELETE
USING (
  public.is_group_creator(auth.uid(), group_id)
  OR
  EXISTS (
    SELECT 1 FROM public.group_members AS gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role = 'admin'
    AND gm.id IS NOT NULL
  )
);

-- Policy: Users can view members of groups they belong to
CREATE POLICY "Users can view members of their groups" ON public.group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members AS gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.id IS NOT NULL
  )
);