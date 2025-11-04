-- Fix infinite recursion in group_members policies properly
-- Drop the problematic policy
DROP POLICY IF EXISTS "Group admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_members;

-- Create security definer function to check if user can manage group
CREATE OR REPLACE FUNCTION public.can_manage_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- User can manage if they created the group
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE groups.id = _group_id 
    AND groups.created_by = _user_id
  )
  OR
  -- OR if they are an admin member
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = _group_id
    AND group_members.user_id = _user_id
    AND group_members.role = 'admin'
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Group admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (public.can_manage_group(auth.uid(), group_id));

CREATE POLICY "Group admins can remove members" ON public.group_members
FOR DELETE
USING (public.can_manage_group(auth.uid(), group_id));