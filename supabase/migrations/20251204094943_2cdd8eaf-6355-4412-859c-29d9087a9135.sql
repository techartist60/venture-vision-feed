-- Fix the groups INSERT policy - make it PERMISSIVE instead of RESTRICTIVE
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

CREATE POLICY "Users can create groups" ON public.groups
FOR INSERT
WITH CHECK (auth.uid() = created_by);