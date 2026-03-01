import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Cast supabase client to bypass empty generated types until they're regenerated
const db = supabase as any;
import { useAuth } from './useAuth';
import type {
  InventoryItem, Sale, SaleItem, Repair, Customer, Loan,
  LoanInstallment, AccountReceivable, ARPayment, Product, Purchase,
} from '@/types';

// ---- Mappers from DB rows to app types ----
function mapProduct(row: any): Product {
  return {
    id: row.id, tenant_id: row.tenant_id, name: row.name,
    brand: row.brand, color: row.color, capacity: row.capacity ?? undefined,
    category: row.category ?? 'celular',
    base_price: Number(row.base_price), image_url: row.image_url ?? undefined,
  };
}

function mapInventoryItem(row: any): InventoryItem {
  return {
    id: row.id, tenant_id: row.tenant_id, product_id: row.product_id,
    purchase_id: row.purchase_id ?? undefined, imei: row.imei ?? undefined,
    serial: row.serial ?? undefined, barcode: row.barcode ?? undefined,
    condition: row.condition, grade: row.grade ?? undefined,
    battery_health: row.battery_health ?? undefined, is_new: row.is_new,
    purchase_cost: Number(row.purchase_cost), sale_price: Number(row.sale_price),
    min_price: Number(row.min_price ?? 0),
    status: row.status, quantity: row.quantity ?? 1,
    seller_name: row.seller_name ?? undefined,
    seller_cedula: row.seller_cedula ?? undefined, seller_phone: row.seller_phone ?? undefined,
    notes: row.notes ?? undefined, created_at: row.created_at,
    product: row.products ? mapProduct(row.products) : undefined,
  };
}

function mapSale(row: any): Sale {
  return {
    id: row.id, tenant_id: row.tenant_id, customer_id: row.customer_id ?? undefined,
    customer_name: row.customer_name, customer_phone: row.customer_phone ?? undefined,
    customer_cedula: row.customer_cedula ?? undefined, total_amount: Number(row.total_amount),
    amount_received: Number(row.amount_received), change_given: Number(row.change_given),
    payment_method: row.payment_method, reference_number: row.reference_number ?? undefined,
    notes: row.notes ?? undefined, sold_at: row.sold_at, deleted_at: row.deleted_at,
    sale_items: row.sale_items?.map(mapSaleItem),
  };
}

function mapSaleItem(row: any): SaleItem {
  return {
    id: row.id, sale_id: row.sale_id, inventory_item_id: row.inventory_item_id ?? undefined,
    brand: row.brand, model: row.model, imei: row.imei ?? undefined,
    color: row.color ?? undefined, quantity: row.quantity,
    unit_price: Number(row.unit_price), subtotal: Number(row.subtotal),
  };
}

function mapRepair(row: any): Repair {
  return {
    id: row.id, tenant_id: row.tenant_id, customer_id: row.customer_id ?? undefined,
    customer_name: row.customer_name, customer_phone: row.customer_phone ?? undefined,
    brand: row.brand, model: row.model, imei: row.imei ?? undefined,
    color: row.color ?? undefined, lock_code: row.lock_code ?? undefined,
    reported_fault: row.reported_fault, checklist: row.checklist || {},
    labor_cost: Number(row.labor_cost), parts_cost: Number(row.parts_cost),
    total_price: Number(row.total_price), advance: Number(row.advance),
    balance: Number(row.balance), status: row.status,
    technician_notes: row.technician_notes ?? undefined, notes: row.notes ?? undefined,
    assigned_to: row.assigned_to ?? undefined, received_at: row.received_at,
    delivered_at: row.delivered_at ?? undefined, created_at: row.created_at,
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id, tenant_id: row.tenant_id, full_name: row.full_name,
    phone: row.phone ?? undefined, cedula: row.cedula ?? undefined,
    email: row.email ?? undefined, address: row.address ?? undefined,
    notes: row.notes ?? undefined, created_at: row.created_at,
  };
}

function mapLoan(row: any): Loan {
  return {
    id: row.id, tenant_id: row.tenant_id, customer_id: row.customer_id ?? undefined,
    sale_id: row.sale_id ?? undefined, customer_name: row.customer_name,
    customer_phone: row.customer_phone, customer_cedula: row.customer_cedula ?? undefined,
    device_brand: row.device_brand, device_model: row.device_model,
    imei: row.imei ?? undefined, total_amount: Number(row.total_amount),
    down_payment: Number(row.down_payment), financed_amount: Number(row.financed_amount),
    monthly_rate: Number(row.monthly_rate), installments: row.installments,
    monthly_payment: Number(row.monthly_payment), balance_due: Number(row.balance_due),
    paid_amount: Number(row.paid_amount), status: row.status,
    start_date: row.start_date, next_due_date: row.next_due_date ?? undefined,
    liquidated_at: row.liquidated_at ?? undefined,
    payment_period: row.payment_period ?? 'monthly',
    loan_installments: row.loan_installments?.map(mapInstallment),
  };
}

function mapInstallment(row: any): LoanInstallment {
  return {
    id: row.id, tenant_id: row.tenant_id ?? undefined, loan_id: row.loan_id,
    installment_number: row.installment_number, due_date: row.due_date,
    opening_balance: Number(row.opening_balance), interest_amount: Number(row.interest_amount),
    principal_amount: Number(row.principal_amount), closing_balance: Number(row.closing_balance),
    scheduled_payment: Number(row.scheduled_payment), paid_amount: Number(row.paid_amount),
    paid_at: row.paid_at ?? undefined, is_paid: row.is_paid,
    is_early_payment: row.is_early_payment ?? undefined,
    payment_notes: row.payment_notes ?? undefined,
  };
}

function mapAR(row: any): AccountReceivable {
  return {
    id: row.id, tenant_id: row.tenant_id, customer_id: row.customer_id ?? undefined,
    sale_id: row.sale_id ?? undefined, customer_name: row.customer_name,
    customer_phone: row.customer_phone ?? undefined, customer_cedula: row.customer_cedula ?? undefined,
    description: row.description, device_brand: row.device_brand ?? undefined,
    device_model: row.device_model ?? undefined, imei: row.imei ?? undefined,
    original_amount: Number(row.original_amount), paid_amount: Number(row.paid_amount),
    balance_due: Number(row.balance_due), status: row.status,
    due_date: row.due_date ?? undefined, notes: row.notes ?? undefined,
  };
}

function mapPurchase(row: any): Purchase {
  return {
    id: row.id, tenant_id: row.tenant_id, supplier_name: row.supplier_name,
    supplier_cedula: row.supplier_cedula ?? undefined, supplier_phone: row.supplier_phone ?? undefined,
    total_amount: Number(row.total_amount), reference_number: row.reference_number ?? undefined,
    notes: row.notes ?? undefined, purchased_at: row.purchased_at,
    deleted_at: row.deleted_at ?? undefined, created_at: row.created_at,
    created_by: row.created_by ?? undefined,
  };
}

export function useStore() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  // ---- Queries ----
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory', tenantId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('inventory_items')
        .select('*, products(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapInventoryItem);
    },
    enabled: !!tenantId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return (data || []).map(mapProduct);
    },
    enabled: !!tenantId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', tenantId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('sales')
        .select('*, sale_items(*)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('sold_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSale);
    },
    enabled: !!tenantId,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', tenantId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('purchases')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPurchase);
    },
    enabled: !!tenantId,
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', tenantId],
    staleTime: 15_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('repairs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapRepair);
    },
    enabled: !!tenantId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', tenantId],
    staleTime: 60_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapCustomer);
    },
    enabled: !!tenantId,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ['loans', tenantId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('loans')
        .select('*, loan_installments(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapLoan);
    },
    enabled: !!tenantId,
  });

  const { data: arList = [] } = useQuery({
    queryKey: ['accounts_receivable', tenantId],
    staleTime: 30_000,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await db
        .from('accounts_receivable')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapAR);
    },
    enabled: !!tenantId,
  });

  const availableInventory = inventory.filter((i) => i.status === 'disponible' && i.quantity > 0);

  // ---- Mutations ----
  const invalidate = (...keys: string[]) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [k, tenantId] }));
  };

  const upsertCustomer = useCallback(async (name: string, phone?: string, cedula?: string) => {
    if (!phone || !tenantId) return;
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      await db.from('customers').update({ full_name: name, cedula: cedula || undefined }).eq('id', existing.id);
    } else {
      await db.from('customers').insert({ tenant_id: tenantId, full_name: name, phone, cedula });
    }
    invalidate('customers');
  }, [tenantId, qc]);

  const createSale = useCallback(async (
    saleData: Omit<Sale, 'id' | 'tenant_id' | 'created_at' | 'sale_items'>,
    items: { inventoryItemId: string; brand: string; model: string; imei?: string; color?: string; unitPrice: number; quantity?: number }[]
  ) => {
    if (!tenantId) throw new Error('No tenant');

    // SEC-4: Validate unit prices against min_price before inserting the sale.
    // Fetch all referenced inventory items in one query.
    const invIds = items.map((it) => it.inventoryItemId);
    const { data: invItems, error: invFetchErr } = await db
      .from('inventory_items')
      .select('id, min_price, quantity')
      .in('id', invIds)
      .eq('tenant_id', tenantId);
    if (invFetchErr) throw invFetchErr;

    const invMap = new Map<string, { min_price: number; quantity: number }>(
      (invItems || []).map((i: any) => [i.id, { min_price: Number(i.min_price ?? 0), quantity: i.quantity ?? 1 }])
    );

    for (const it of items) {
      const inv = invMap.get(it.inventoryItemId);
      if (inv && inv.min_price > 0 && it.unitPrice < inv.min_price) {
        throw new Error(
          `El precio de "${it.brand} ${it.model}" (${it.unitPrice}) está por debajo del precio mínimo permitido (${inv.min_price}).`
        );
      }
    }

    const { data: sale, error } = await db
      .from('sales')
      .insert({
        tenant_id: tenantId,
        customer_id: saleData.customer_id || null,
        customer_name: saleData.customer_name,
        customer_phone: saleData.customer_phone || null,
        customer_cedula: saleData.customer_cedula || null,
        total_amount: saleData.total_amount,
        amount_received: saleData.amount_received,
        change_given: saleData.change_given,
        payment_method: saleData.payment_method,
        reference_number: saleData.reference_number || null,
        notes: saleData.notes || null,
        sold_at: saleData.sold_at,
      })
      .select()
      .single();
    if (error) throw error;

    const saleItems = items.map((it) => ({
      sale_id: sale.id,
      inventory_item_id: it.inventoryItemId,
      brand: it.brand,
      model: it.model,
      imei: it.imei || null,
      color: it.color || null,
      quantity: it.quantity || 1,
      unit_price: it.unitPrice,
      subtotal: it.unitPrice * (it.quantity || 1),
    }));
    await db.from('sale_items').insert(saleItems);

    // PERF-4 + SEC-3: Decrement inventory in parallel. We already fetched quantities above.
    // Using Promise.all mitigates sequential waterfall. Full atomic protection requires a DB-side RPC.
    await Promise.all(
      items.map((it) => {
        const inv = invMap.get(it.inventoryItemId);
        const qty = it.quantity || 1;
        const currentQty = inv?.quantity ?? 1;
        const newQty = Math.max(0, currentQty - qty);
        return db.from('inventory_items').update({
          quantity: newQty,
          status: newQty <= 0 ? 'vendido' : 'disponible',
        }).eq('id', it.inventoryItemId).eq('tenant_id', tenantId);
      })
    );

    invalidate('sales', 'inventory');
    return mapSale({ ...sale, sale_items: saleItems });
  }, [tenantId, qc]);

  const createLoan = useCallback(async (
    loanData: Omit<Loan, 'id' | 'tenant_id' | 'loan_installments'>,
    installments: Omit<LoanInstallment, 'id' | 'tenant_id'>[]
  ) => {
    if (!tenantId) throw new Error('No tenant');

    const { data: loan, error } = await db
      .from('loans')
      .insert({
        tenant_id: tenantId,
        customer_id: loanData.customer_id || null,
        sale_id: loanData.sale_id || null,
        customer_name: loanData.customer_name,
        customer_phone: loanData.customer_phone,
        customer_cedula: loanData.customer_cedula || null,
        device_brand: loanData.device_brand,
        device_model: loanData.device_model,
        imei: loanData.imei || null,
        total_amount: loanData.total_amount,
        down_payment: loanData.down_payment,
        financed_amount: loanData.financed_amount,
        monthly_rate: loanData.monthly_rate,
        installments: loanData.installments,
        monthly_payment: loanData.monthly_payment,
        balance_due: loanData.balance_due,
        paid_amount: loanData.paid_amount,
        status: loanData.status,
        start_date: loanData.start_date,
        next_due_date: loanData.next_due_date || null,
        payment_period: loanData.payment_period || 'monthly',
      })
      .select()
      .single();
    if (error) throw error;

    const instRows = installments.map((inst) => ({
      tenant_id: tenantId,
      loan_id: loan.id,
      installment_number: inst.installment_number,
      due_date: inst.due_date,
      opening_balance: inst.opening_balance,
      interest_amount: inst.interest_amount,
      principal_amount: inst.principal_amount,
      closing_balance: inst.closing_balance,
      scheduled_payment: inst.scheduled_payment,
      paid_amount: inst.paid_amount,
      is_paid: inst.is_paid,
    }));
    await db.from('loan_installments').insert(instRows);

    invalidate('loans');
    return mapLoan({ ...loan, loan_installments: instRows });
  }, [tenantId, qc]);

  const payInstallment = useCallback(async (loanId: string, installmentId: string) => {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: {
        action: 'pay_installment',
        loan_id: loanId,
        installment_id: installmentId,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    invalidate('loans');
  }, [qc, tenantId]);

  const liquidateLoan = useCallback(async (loanId: string) => {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: {
        action: 'liquidate_loan',
        loan_id: loanId,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    invalidate('loans');
  }, [qc, tenantId]);

  const createAR = useCallback(async (ar: Omit<AccountReceivable, 'id' | 'tenant_id'>) => {
    if (!tenantId) throw new Error('No tenant');
    const { data, error } = await db
      .from('accounts_receivable')
      .insert({ ...ar, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    invalidate('accounts_receivable');
    return mapAR(data);
  }, [tenantId, qc]);

  const createRepair = useCallback(async (repair: Omit<Repair, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!tenantId) throw new Error('No tenant');
    const { data, error } = await db
      .from('repairs')
      .insert({
        tenant_id: tenantId,
        customer_id: repair.customer_id || null,
        customer_name: repair.customer_name,
        customer_phone: repair.customer_phone || null,
        brand: repair.brand,
        model: repair.model,
        imei: repair.imei || null,
        color: repair.color || null,
        lock_code: repair.lock_code || null,
        reported_fault: repair.reported_fault,
        checklist: repair.checklist,
        labor_cost: repair.labor_cost,
        parts_cost: repair.parts_cost,
        total_price: repair.total_price,
        advance: repair.advance,
        balance: repair.balance,
        status: repair.status,
        technician_notes: repair.technician_notes || null,
        notes: repair.notes || null,
        assigned_to: repair.assigned_to || null,
        received_at: repair.received_at,
      })
      .select()
      .single();
    if (error) throw error;
    invalidate('repairs');
    return mapRepair(data);
  }, [tenantId, qc]);

  const updateRepair = useCallback(async (id: string, updates: Partial<Repair>) => {
    // SEC-5: Always filter by tenant_id as a second line of defense.
    if (!tenantId) throw new Error('No tenant');
    const { error } = await db.from('repairs').update(updates).eq('id', id).eq('tenant_id', tenantId);
    if (error) throw error;
    invalidate('repairs');
  }, [qc, tenantId]);

  const createPurchase = useCallback(async (purchaseData: {
    supplierName: string; supplierPhone?: string; supplierCedula?: string; notes?: string;
    items: Array<{
      category?: string; brand: string; model: string; imei?: string; color?: string; capacity?: string;
      condition: string; grade?: string; batteryHealth?: number; isNew: boolean;
      purchaseCost: number; salePrice: number; quantity?: number;
    }>;
  }) => {
    if (!tenantId) throw new Error('No tenant');

    const totalAmount = purchaseData.items.reduce((s, i) => s + i.purchaseCost, 0);

    const { data: purchase, error } = await db
      .from('purchases')
      .insert({
        tenant_id: tenantId,
        supplier_name: purchaseData.supplierName,
        supplier_cedula: purchaseData.supplierCedula || null,
        supplier_phone: purchaseData.supplierPhone || null,
        total_amount: totalAmount,
        notes: purchaseData.notes || null,
      })
      .select()
      .single();
    if (error) throw error;

    // PERF-2: Process each item, resolving product upsert then inserting inventory.
    // Items are processed in parallel batches where possible.
    await Promise.all(
      purchaseData.items.map(async (item) => {
        let productId: string;
        const category = item.category || 'celular';
        const { data: existingProduct } = await db
          .from('products')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('brand', item.brand)
          .eq('name', item.model)
          .eq('color', item.color || '')
          .eq('category', category)
          .maybeSingle();

        if (existingProduct) {
          productId = existingProduct.id;

          // For accessories, try to increment existing stock
          if (category === 'accesorio') {
            const { data: existingInv } = await db
              .from('inventory_items')
              .select('id, quantity')
              .eq('product_id', existingProduct.id)
              .eq('tenant_id', tenantId)
              .eq('status', 'disponible')
              .eq('purchase_cost', item.purchaseCost)
              .eq('sale_price', item.salePrice)
              .maybeSingle();

            if (existingInv) {
              const newQty = (existingInv.quantity || 1) + (item.quantity || 1);
              await db.from('inventory_items').update({ quantity: newQty }).eq('id', existingInv.id);
              return; // Skip creating a new inventory item
            }
          }
        } else {
          const { data: newProduct, error: pErr } = await db
            .from('products')
            .insert({
              tenant_id: tenantId,
              name: item.model,
              brand: item.brand,
              color: item.color || '',
              capacity: item.capacity || null,
              category,
              base_price: item.salePrice,
            })
            .select()
            .single();
          if (pErr) throw pErr;
          productId = newProduct.id;
        }

        await db.from('inventory_items').insert({
          tenant_id: tenantId,
          product_id: productId,
          purchase_id: purchase.id,
          imei: item.imei || null,
          condition: item.condition,
          grade: item.grade || null,
          battery_health: item.batteryHealth ?? null,
          is_new: item.isNew,
          purchase_cost: item.purchaseCost,
          sale_price: item.salePrice,
          quantity: item.quantity || 1,
          status: 'disponible',
        });
      })
    );

    invalidate('purchases', 'inventory', 'products');
    return mapPurchase(purchase);
  }, [tenantId, qc]);

  const deleteSale = useCallback(async (saleId: string) => {
    if (!tenantId) throw new Error('No tenant');
    // Soft delete: set deleted_at
    const { error } = await db
      .from('sales')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', saleId)
      .eq('tenant_id', tenantId);
    if (error) throw error;

    // PERF-3: Restore inventory items in parallel.
    const { data: saleItems } = await db
      .from('sale_items')
      .select('inventory_item_id, quantity')
      .eq('sale_id', saleId);

    if (saleItems && saleItems.length > 0) {
      // Fetch all current quantities in one query
      const ids = saleItems.map((si: any) => si.inventory_item_id).filter(Boolean);
      const { data: currentInvItems } = await db
        .from('inventory_items')
        .select('id, quantity')
        .in('id', ids);

      const qtyMap = new Map<string, number>(
        (currentInvItems || []).map((i: any) => [i.id, i.quantity ?? 0])
      );

      await Promise.all(
        saleItems
          .filter((si: any) => si.inventory_item_id)
          .map((si: any) => {
            const currentQty = qtyMap.get(si.inventory_item_id) ?? 0;
            const newQty = currentQty + (si.quantity || 1);
            return db.from('inventory_items').update({
              quantity: newQty,
              status: 'disponible',
            }).eq('id', si.inventory_item_id).eq('tenant_id', tenantId);
          })
      );
    }

    invalidate('sales', 'inventory');
  }, [tenantId, qc]);

  return {
    inventory, availableInventory, products,
    sales, createSale, deleteSale,
    purchases, createPurchase,
    repairs, createRepair, updateRepair,
    customers, upsertCustomer,
    loans, createLoan, payInstallment, liquidateLoan,
    arList, createAR,
  };
}
