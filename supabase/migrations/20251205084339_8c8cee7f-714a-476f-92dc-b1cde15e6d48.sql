-- Allow group creators to view their own groups (even if not a member yet)
DROP POLICY IF EXISTS "Users can view groups they are members of" ON public.groups;

CREATE POLICY "Users can view groups they are members of or created" ON public.groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = groups.id
    AND group_members.user_id = auth.uid()
  )
  OR created_by = auth.uid()
);