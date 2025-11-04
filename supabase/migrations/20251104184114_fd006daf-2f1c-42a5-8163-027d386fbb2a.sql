-- Fix infinite recursion in group_members policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;

-- Create a new policy that doesn't cause recursion
-- Allow group creators and existing admins to add members
CREATE POLICY "Group admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (
  -- Allow if the user is the group creator
  EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = group_members.group_id 
    AND groups.created_by = auth.uid()
  )
  OR
  -- Allow if the user is already an admin member (check from a different context)
  auth.uid() IN (
    SELECT user_id FROM public.group_members AS existing_members
    WHERE existing_members.group_id = group_members.group_id
    AND existing_members.role = 'admin'
  )
);