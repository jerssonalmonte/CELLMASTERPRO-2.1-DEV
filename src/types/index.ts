export type AppRole = 'admin' | 'manager' | 'staff' | 'technician' | 'super_admin';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  blocked_at?: string | null;
  created_at: string;
  warranty_text?: string;
  logo_url?: string | null;
  subscription_status?: string;
  subscription_plan?: string;
  monthly_fee?: number;
  next_due_date?: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  tenant_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  avatar_url?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  phone?: string;
  cedula?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  tenant_id: string;
  full_name: string;
  company?: string;
  phone?: string;
  cedula?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export type ProductCategory = 'celular' | 'accesorio' | 'repuesto';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  brand: string;
  color: string;
  capacity?: string;
  category: ProductCategory;
  base_price: number;
  image_url?: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  product_id: string;
  purchase_id?: string;
  imei?: string;
  serial?: string;
  barcode?: string;
  condition: string;
  grade?: string;
  battery_health?: number;
  is_new: boolean;
  purchase_cost: number;
  sale_price: number;
  min_price: number;
  status: string;
  quantity: number;
  seller_name?: string;
  seller_cedula?: string;
  seller_phone?: string;
  notes?: string;
  created_at: string;
  product?: Product;
}

export interface Sale {
  id: string;
  tenant_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_cedula?: string;
  total_amount: number;
  amount_received: number;
  change_given: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  sold_at: string;
  deleted_at?: string | null;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  inventory_item_id?: string;
  brand: string;
  model: string;
  imei?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  tenant_id: string;
  supplier_name: string;
  supplier_cedula?: string;
  supplier_phone?: string;
  total_amount: number;
  reference_number?: string;
  notes?: string;
  purchased_at: string;
  deleted_at?: string | null;
  created_at: string;
  created_by?: string;
}

export interface Repair {
  id: string;
  tenant_id: string;
  customer_id?: string;
  customer_name: string;
  customer_phone?: string;
  brand: string;
  model: string;
  imei?: string;
  color?: string;
  lock_code?: string;
  reported_fault: string;
  checklist: RepairChecklist;
  labor_cost: number;
  parts_cost: number;
  total_price: number;
  advance: number;
  balance: number;
  status: RepairStatus;
  technician_notes?: string;
  notes?: string;
  assigned_to?: string;
  received_at: string;
  delivered_at?: string;
  created_at: string;
}

export type RepairStatus =
  | 'recibido'
  | 'diagnosticando'
  | 'espera_pieza'
  | 'en_proceso'
  | 'en_prueba'
  | 'listo'
  | 'entregado'
  | 'no_se_pudo';

export interface RepairChecklist {
  brokenScreen?: boolean;
  scratchedBack?: boolean;
  noDisplay?: boolean;
  sunkenButtons?: boolean;
  missingParts?: boolean;
  waterDamage?: boolean;
  crackedBack?: boolean;
  chargerPortDamage?: boolean;
}

export type PaymentPeriod = 'weekly' | 'biweekly' | 'monthly';

export interface Loan {
  id: string;
  tenant_id: string;
  customer_id?: string;
  sale_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_cedula?: string;
  device_brand: string;
  device_model: string;
  imei?: string;
  total_amount: number;
  down_payment: number;
  financed_amount: number;
  monthly_rate: number;
  installments: number;
  monthly_payment: number;
  balance_due: number;
  paid_amount: number;
  status: string;
  start_date: string;
  next_due_date?: string;
  liquidated_at?: string;
  payment_period?: PaymentPeriod;
  loan_installments?: LoanInstallment[];
}

export interface LoanInstallment {
  id: string;
  tenant_id?: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  opening_balance: number;
  interest_amount: number;
  principal_amount: number;
  closing_balance: number;
  scheduled_payment: number;
  paid_amount: number;
  paid_at?: string;
  is_paid: boolean;
  is_early_payment?: boolean;
  payment_notes?: string;
}

export interface AccountReceivable {
  id: string;
  tenant_id: string;
  customer_id?: string;
  sale_id?: string;
  customer_name: string;
  customer_phone?: string;
  customer_cedula?: string;
  description: string;
  device_brand?: string;
  device_model?: string;
  imei?: string;
  original_amount: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  due_date?: string;
  notes?: string;
}

export interface ARPayment {
  id: string;
  ar_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
}

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}
