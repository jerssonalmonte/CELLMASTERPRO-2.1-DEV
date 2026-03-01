
-- ============================================
-- 1. ENUM
-- ============================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'staff', 'technician');

-- ============================================
-- 2. BASE TABLES
-- ============================================

-- Tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  blocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  cedula TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  cedula TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  capacity TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory Items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  purchase_id UUID,
  imei TEXT,
  serial TEXT,
  condition TEXT NOT NULL DEFAULT 'usado',
  grade TEXT,
  battery_health INT,
  is_new BOOLEAN NOT NULL DEFAULT false,
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponible',
  seller_name TEXT,
  seller_cedula TEXT,
  seller_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  customer_cedula TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_given NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  reference_number TEXT,
  notes TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Sale Items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  imei TEXT,
  color TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  supplier_name TEXT NOT NULL DEFAULT '',
  supplier_cedula TEXT,
  supplier_phone TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_number TEXT,
  notes TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Repairs
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  imei TEXT,
  color TEXT,
  lock_code TEXT,
  reported_fault TEXT NOT NULL DEFAULT '',
  checklist JSONB NOT NULL DEFAULT '{}',
  labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  parts_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'recibido',
  technician_notes TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loans
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_cedula TEXT,
  device_brand TEXT NOT NULL DEFAULT '',
  device_model TEXT NOT NULL DEFAULT '',
  imei TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  financed_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  installments INT NOT NULL DEFAULT 1,
  monthly_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'activo',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  liquidated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loan Installments
CREATE TABLE public.loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  interest_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  principal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  scheduled_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_early_payment BOOLEAN DEFAULT false,
  payment_notes TEXT
);

-- Accounts Receivable
CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  customer_cedula TEXT,
  description TEXT NOT NULL DEFAULT '',
  device_brand TEXT,
  device_model TEXT,
  imei TEXT,
  original_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AR Payments
CREATE TABLE public.ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_id UUID REFERENCES public.accounts_receivable(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX idx_suppliers_tenant_id ON public.suppliers(tenant_id);
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX idx_inventory_items_tenant_id ON public.inventory_items(tenant_id);
CREATE INDEX idx_inventory_items_imei ON public.inventory_items(imei);
CREATE INDEX idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX idx_purchases_tenant_id ON public.purchases(tenant_id);
CREATE INDEX idx_repairs_tenant_id ON public.repairs(tenant_id);
CREATE INDEX idx_repairs_assigned_to ON public.repairs(assigned_to);
CREATE INDEX idx_loans_tenant_id ON public.loans(tenant_id);
CREATE INDEX idx_loan_installments_loan_id ON public.loan_installments(loan_id);
CREATE INDEX idx_ar_tenant_id ON public.accounts_receivable(tenant_id);
CREATE INDEX idx_ar_payments_ar_id ON public.ar_payments(ar_id);

-- ============================================
-- 4. HELPER FUNCTIONS (security definer)
-- ============================================

-- Get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Check if user has any role in a tenant
CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Check if user is manager or above in their tenant
CREATE OR REPLACE FUNCTION public.is_manager_or_above(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('super_admin', 'admin', 'manager')
  );
$$;

-- Check if user is admin or above in their tenant
CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('super_admin', 'admin')
  );
$$;

-- Check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _full_name TEXT;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  
  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, tenant_id, full_name, first_name, last_name, username)
    VALUES (
      NEW.id,
      _tenant_id,
      _full_name,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(_full_name, ' ', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(_full_name, ' ', 2)),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (
      NEW.id,
      _tenant_id,
      COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'staff')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 7. ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- TENANTS
CREATE POLICY "Super admins see all tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_tenant_access(auth.uid(), id));

CREATE POLICY "Super admins manage tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- PROFILES
CREATE POLICY "Users see own tenant profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_tenant_access(auth.uid(), tenant_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- USER ROLES
CREATE POLICY "Users see roles in their tenant" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_tenant_access(auth.uid(), tenant_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid(), tenant_id));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid(), tenant_id));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid(), tenant_id));

-- CUSTOMERS (all tenant members CRUD)
CREATE POLICY "Tenant members access customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members insert customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- SUPPLIERS
CREATE POLICY "Tenant members access suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members insert suppliers" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

-- PRODUCTS
CREATE POLICY "Tenant members see products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update products" ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Managers+ delete products" ON public.products
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- INVENTORY ITEMS
CREATE POLICY "Tenant members see inventory" ON public.inventory_items
  FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members insert inventory" ON public.inventory_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update inventory" ON public.inventory_items
  FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Managers+ delete inventory" ON public.inventory_items
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- SALES
CREATE POLICY "Tenant members see sales" ON public.sales
  FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members insert sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update sales" ON public.sales
  FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Managers+ delete sales" ON public.sales
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- SALE ITEMS (access follows sale)
CREATE POLICY "Tenant members see sale items" ON public.sale_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND (public.has_tenant_access(auth.uid(), s.tenant_id) OR public.is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Tenant members insert sale items" ON public.sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND public.has_tenant_access(auth.uid(), s.tenant_id)
    )
  );

CREATE POLICY "Tenant members update sale items" ON public.sale_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND public.has_tenant_access(auth.uid(), s.tenant_id)
    )
  );

CREATE POLICY "Managers+ delete sale items" ON public.sale_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = sale_id
      AND public.is_manager_or_above(auth.uid(), s.tenant_id)
    )
  );

-- PURCHASES
CREATE POLICY "Tenant members see purchases" ON public.purchases
  FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members insert purchases" ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update purchases" ON public.purchases
  FOR UPDATE TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Managers+ delete purchases" ON public.purchases
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- REPAIRS
CREATE POLICY "Tenant members and assigned techs see repairs" ON public.repairs
  FOR SELECT TO authenticated
  USING (
    public.has_tenant_access(auth.uid(), tenant_id)
    OR assigned_to = auth.uid()
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members insert repairs" ON public.repairs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant members update repairs" ON public.repairs
  FOR UPDATE TO authenticated
  USING (
    public.has_tenant_access(auth.uid(), tenant_id)
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Managers+ delete repairs" ON public.repairs
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- LOANS
CREATE POLICY "Managers+ see loans" ON public.loans
  FOR SELECT TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Managers+ insert loans" ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_above(auth.uid(), tenant_id));

CREATE POLICY "Managers+ update loans" ON public.loans
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

CREATE POLICY "Managers+ delete loans" ON public.loans
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- LOAN INSTALLMENTS
CREATE POLICY "Managers+ see installments" ON public.loan_installments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id
      AND (public.is_manager_or_above(auth.uid(), l.tenant_id) OR public.is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Managers+ insert installments" ON public.loan_installments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id
      AND public.is_manager_or_above(auth.uid(), l.tenant_id)
    )
  );

CREATE POLICY "Managers+ update installments" ON public.loan_installments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id
      AND public.is_manager_or_above(auth.uid(), l.tenant_id)
    )
  );

CREATE POLICY "Managers+ delete installments" ON public.loan_installments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.id = loan_id
      AND public.is_manager_or_above(auth.uid(), l.tenant_id)
    )
  );

-- ACCOUNTS RECEIVABLE
CREATE POLICY "Managers+ see AR" ON public.accounts_receivable
  FOR SELECT TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Managers+ insert AR" ON public.accounts_receivable
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_above(auth.uid(), tenant_id));

CREATE POLICY "Managers+ update AR" ON public.accounts_receivable
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

CREATE POLICY "Managers+ delete AR" ON public.accounts_receivable
  FOR DELETE TO authenticated
  USING (public.is_manager_or_above(auth.uid(), tenant_id));

-- AR PAYMENTS
CREATE POLICY "Managers+ see AR payments" ON public.ar_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.id = ar_id
      AND (public.is_manager_or_above(auth.uid(), ar.tenant_id) OR public.is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Managers+ insert AR payments" ON public.ar_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.id = ar_id
      AND public.is_manager_or_above(auth.uid(), ar.tenant_id)
    )
  );

CREATE POLICY "Managers+ update AR payments" ON public.ar_payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.id = ar_id
      AND public.is_manager_or_above(auth.uid(), ar.tenant_id)
    )
  );

CREATE POLICY "Managers+ delete AR payments" ON public.ar_payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts_receivable ar
      WHERE ar.id = ar_id
      AND public.is_manager_or_above(auth.uid(), ar.tenant_id)
    )
  );

-- FK for inventory_items.purchase_id
ALTER TABLE public.inventory_items
  ADD CONSTRAINT fk_inventory_purchase
  FOREIGN KEY (purchase_id) REFERENCES public.purchases(id) ON DELETE SET NULL;
