
-- Create saas_notifications table
CREATE TABLE public.saas_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saas_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access notifications"
  ON public.saas_notifications
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Trigger function: when saas_invoices status changes to 'paid', create notification
CREATE OR REPLACE FUNCTION public.notify_invoice_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_name TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT name INTO _tenant_name FROM public.tenants WHERE id = NEW.tenant_id;
    INSERT INTO public.saas_notifications (title, message)
    VALUES (
      'Pago recibido',
      'Factura de ' || COALESCE(_tenant_name, 'Organización desconocida') || ' marcada como pagada — RD$' || NEW.amount_due
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_paid_notification
  AFTER UPDATE ON public.saas_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_invoice_paid();
