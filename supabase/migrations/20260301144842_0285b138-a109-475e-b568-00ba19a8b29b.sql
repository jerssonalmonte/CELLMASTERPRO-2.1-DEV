
-- Fix: The two RESTRICTIVE UPDATE policies on tenants require BOTH to pass.
-- Admins fail "Super admins update tenants" so they can never update.
-- Solution: Drop both and create a single combined RESTRICTIVE policy.

DROP POLICY IF EXISTS "Admins update own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Super admins update tenants" ON public.tenants;

CREATE POLICY "Admins or super admins update tenants"
  ON public.tenants
  FOR UPDATE
  USING (is_admin_or_above(auth.uid(), id) OR is_super_admin(auth.uid()))
  WITH CHECK (is_admin_or_above(auth.uid(), id) OR is_super_admin(auth.uid()));
