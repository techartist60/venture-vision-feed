-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Group creators and admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Group creators and admins can remove members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;

-- Drop and recreate the function with correct parameter order
DROP FUNCTION IF EXISTS public.is_group_creator(uuid, uuid);

-- Create function to check if user is the group creator
CREATE OR REPLACE FUNCTION public.is_group_creator(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id 
    AND created_by = _user_id
  );
$$;

-- Create function to check if user is admin of group
CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
    AND user_id = _user_id
    AND role = 'admin'
  );
$$;

-- Create function to check if user is member of group
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id
    AND user_id = _user_id
  );
$$;

-- Policy: Group creators and admins can add members
CREATE POLICY "Group creators and admins can add members" ON public.group_members
FOR INSERT
WITH CHECK (
  public.is_group_creator(group_id, auth.uid())
  OR public.is_group_admin(group_id, auth.uid())
);

-- Policy: Group creators and admins can remove members
CREATE POLICY "Group creators and admins can remove members" ON public.group_members
FOR DELETE
USING (
  public.is_group_creator(group_id, auth.uid())
  OR public.is_group_admin(group_id, auth.uid())
);

-- Policy: Users can view members of groups they belong to
CREATE POLICY "Users can view members of their groups" ON public.group_members
FOR SELECT
USING (
  public.is_group_member(group_id, auth.uid())
);