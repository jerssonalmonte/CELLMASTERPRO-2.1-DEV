
-- 1. Drop existing role management policies
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;

-- 2. Recreate INSERT policy: prevent privilege escalation
-- Admins can only assign roles below super_admin, and cannot insert for themselves
CREATE POLICY "Admins insert roles no escalation"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_admin_or_above(auth.uid(), tenant_id)
  AND user_id != auth.uid()
  AND role != 'super_admin'
);

-- Super admins can insert any role for anyone except themselves
CREATE POLICY "Super admins insert roles except self"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  AND user_id != auth.uid()
);

-- 3. Recreate UPDATE policy: no one can change their own role
CREATE POLICY "Admins update roles no self"
ON public.user_roles
FOR UPDATE
USING (
  is_admin_or_above(auth.uid(), tenant_id)
  AND user_id != auth.uid()
  AND role != 'super_admin'
);

CREATE POLICY "Super admins update roles except self"
ON public.user_roles
FOR UPDATE
USING (
  is_super_admin(auth.uid())
  AND user_id != auth.uid()
);

-- 4. Recreate DELETE policy: same pattern
CREATE POLICY "Admins delete roles no self"
ON public.user_roles
FOR DELETE
USING (
  is_admin_or_above(auth.uid(), tenant_id)
  AND user_id != auth.uid()
  AND role != 'super_admin'
);

CREATE POLICY "Super admins delete roles except self"
ON public.user_roles
FOR DELETE
USING (
  is_super_admin(auth.uid())
  AND user_id != auth.uid()
);
