-- Fix group_members INSERT policy to allow creators to add themselves
DROP POLICY IF EXISTS "Group creators and admins can add members" ON public.group_members;

CREATE POLICY "Group creators and admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (
  -- Allow group creator to add themselves or anyone else
  is_group_creator(group_id, auth.uid())
  -- Allow existing admins to add members  
  OR is_group_admin(group_id, auth.uid())
);