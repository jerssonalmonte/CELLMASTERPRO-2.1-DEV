
-- Add category column to products to distinguish phones from accessories
ALTER TABLE public.products ADD COLUMN category text NOT NULL DEFAULT 'celular';

-- Create index for filtering by category
CREATE INDEX idx_products_category ON public.products (category);
