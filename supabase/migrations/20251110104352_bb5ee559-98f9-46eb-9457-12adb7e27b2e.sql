-- Drop the overly restrictive ALL policy
DROP POLICY IF EXISTS "Only admins can manage user roles" ON public.user_roles;

-- Allow INSERT for first admin or by existing admins
CREATE POLICY "Allow first user or admins to insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Allow if user is already an admin
  has_role(auth.uid(), 'admin')
  OR
  -- Allow if this is the first user (no roles exist yet)
  NOT EXISTS (SELECT 1 FROM public.user_roles)
  OR
  -- Allow inserting own role if being set by system
  user_id = auth.uid()
);

-- Only admins can update roles
CREATE POLICY "Only admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Only admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'));