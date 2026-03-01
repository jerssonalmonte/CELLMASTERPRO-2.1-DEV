
-- ============================================================
-- 1) saas_invoices: SaaS billing invoices managed by super admin
-- ============================================================
CREATE TABLE public.saas_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saas_invoices ENABLE ROW LEVEL SECURITY;

-- Super admins: full CRUD
CREATE POLICY "Super admins full access invoices"
  ON public.saas_invoices FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Tenant members: read-only on their own invoices
CREATE POLICY "Tenants read own invoices"
  ON public.saas_invoices FOR SELECT
  USING (has_tenant_access(auth.uid(), tenant_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saas_invoices_tenant_id ON public.saas_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON public.saas_invoices (status);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_due_date ON public.saas_invoices (due_date DESC);

-- ============================================================
-- 2) Add installation_status to tenants
-- ============================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS installation_status TEXT NOT NULL DEFAULT 'pending';
