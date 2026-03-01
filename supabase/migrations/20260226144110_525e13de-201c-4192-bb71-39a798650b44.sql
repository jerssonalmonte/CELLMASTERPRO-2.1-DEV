
-- Add barcode column to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN barcode text;

-- Add payment_period column to loans (weekly, biweekly, monthly)
ALTER TABLE public.loans ADD COLUMN payment_period text NOT NULL DEFAULT 'monthly';
