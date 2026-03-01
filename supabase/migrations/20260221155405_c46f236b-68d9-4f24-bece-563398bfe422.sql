
-- Add quantity column to inventory_items for accessory stock management
ALTER TABLE public.inventory_items ADD COLUMN quantity integer NOT NULL DEFAULT 1;
