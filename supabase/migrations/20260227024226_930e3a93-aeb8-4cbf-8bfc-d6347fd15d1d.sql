
-- Add subscription columns to tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS monthly_fee numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS next_due_date date;

-- Drop the overly broad "Super admins manage tenants" ALL policy and replace with granular ones
DROP POLICY IF EXISTS "Super admins manage tenants" ON public.tenants;

-- Super admins can insert tenants
CREATE POLICY "Super admins insert tenants"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can update tenants (all columns)
CREATE POLICY "Super admins update tenants"
ON public.tenants FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can delete tenants
CREATE POLICY "Super admins delete tenants"
ON public.tenants FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Admins can update ONLY non-subscription fields of their own tenant
-- We use a trigger to enforce subscription field protection
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the user is NOT a super_admin, prevent changes to subscription fields
  IF NOT is_super_admin(auth.uid()) THEN
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.monthly_fee := OLD.monthly_fee;
    NEW.next_due_date := OLD.next_due_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_subscription_fields_trigger ON public.tenants;
CREATE TRIGGER protect_subscription_fields_trigger
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.protect_subscription_fields();

-- Allow admins to update their own tenant (non-subscription fields enforced by trigger)
CREATE POLICY "Admins update own tenant"
ON public.tenants FOR UPDATE
TO authenticated
USING (is_admin_or_above(auth.uid(), id))
WITH CHECK (is_admin_or_above(auth.uid(), id));
