
-- Add warranty_text column to tenants for configurable warranty message on receipts
ALTER TABLE public.tenants ADD COLUMN warranty_text text DEFAULT 'Garantía de 30 días por defectos de fábrica. No cubre daños por agua, caídas o mal uso.';
