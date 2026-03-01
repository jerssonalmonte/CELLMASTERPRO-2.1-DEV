
-- Fix privilege escalation: Admins could UPDATE a role TO super_admin
-- because WITH CHECK was missing on the update policy.

-- 1. DROP and recreate UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Admins update roles no self" ON public.user_roles;

CREATE POLICY "Admins update roles no self" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  is_admin_or_above(auth.uid(), tenant_id)
  AND user_id <> auth.uid()
  AND role <> 'super_admin'::app_role
)
WITH CHECK (
  is_admin_or_above(auth.uid(), tenant_id)
  AND user_id <> auth.uid()
  AND role <> 'super_admin'::app_role
);

-- 2. DROP and recreate INSERT policy (already had WITH CHECK, but re-confirm for consistency)
DROP POLICY IF EXISTS "Admins insert roles no escalation" ON public.user_roles;

CREATE POLICY "Admins insert roles no escalation" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  is_admin_or_above(auth.uid(), tenant_id)
  AND user_id <> auth.uid()
  AND role <> 'super_admin'::app_role
);
