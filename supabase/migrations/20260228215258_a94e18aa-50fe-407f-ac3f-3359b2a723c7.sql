
-- Performance indexes for frequently queried columns

-- Foreign key indexes (FK columns without automatic indexes)
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_id ON public.inventory_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON public.inventory_items (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_purchase_id ON public.inventory_items (purchase_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items (status);

CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON public.sales (created_by);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_inventory_item_id ON public.sale_items (inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_repairs_tenant_id ON public.repairs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_repairs_customer_id ON public.repairs (customer_id);
CREATE INDEX IF NOT EXISTS idx_repairs_assigned_to ON public.repairs (assigned_to);

CREATE INDEX IF NOT EXISTS idx_loans_tenant_id ON public.loans (tenant_id);
CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON public.loans (customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_sale_id ON public.loans (sale_id);

CREATE INDEX IF NOT EXISTS idx_loan_installments_loan_id ON public.loan_installments (loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_tenant_id ON public.loan_installments (tenant_id);

CREATE INDEX IF NOT EXISTS idx_purchases_tenant_id ON public.purchases (tenant_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products (tenant_id);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers (tenant_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles (tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles (tenant_id);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_tenant_id ON public.accounts_receivable (tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_customer_id ON public.accounts_receivable (customer_id);

CREATE INDEX IF NOT EXISTS idx_ar_payments_ar_id ON public.ar_payments (ar_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers (tenant_id);

-- Ordering/filtering indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON public.sales (sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_repairs_created_at ON public.repairs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON public.inventory_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_purchased_at ON public.purchases (purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_loans_created_at ON public.loans (created_at DESC);

-- Composite indexes for common filtered + sorted queries
CREATE INDEX IF NOT EXISTS idx_sales_tenant_sold ON public.sales (tenant_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_status ON public.inventory_items (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_repairs_tenant_status ON public.repairs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_loans_tenant_status ON public.loans (tenant_id, status);
