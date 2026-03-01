
-- ============================================================
-- saas_appointments: Super Admin agenda / calendar
-- ============================================================
CREATE TABLE public.saas_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled',
  location TEXT,
  notes TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access appointments"
  ON public.saas_appointments FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_saas_appointments_scheduled ON public.saas_appointments (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_saas_appointments_status ON public.saas_appointments (status);
CREATE INDEX IF NOT EXISTS idx_saas_appointments_tenant ON public.saas_appointments (tenant_id);
