import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { CustomerAutocomplete } from '@/components/CustomerAutocomplete';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { playSuccess, playError } from '@/lib/sounds';
import { printSaleReceipt, type SaleReceiptOptions } from '@/components/PrintReceipt';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Printer, Check, CreditCard, Banknote, FileText, X, Tag, Barcode, ArrowLeftRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryItem, LoanInstallment, PaymentPeriod } from '@/types';
import { CATALOG_BRANDS, DEVICE_CATALOG, findCatalogDevice } from '@/data/deviceCatalog';

interface CartItem {
  inventoryItem: InventoryItem;
  price: number;
  quantity: number;
}

interface TradeInDevice {
  brand: string;
  model: string;
  imei: string;
  color: string;
  condition: string;
  batteryHealth: string;
  value: string; // trade-in value (discount)
  inventoryItemId?: string; // if from existing trade-in inventory
}

export default function Vender() {
  const { availableInventory, customers, createSale, upsertCustomer, createLoan, createAR, createPurchase, purchases, inventory } = useStore();
  const { user, tenant } = useAuth();

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'financing' | 'credit'>('cash');
  const [applyItbis, setApplyItbis] = useState(false);
  const [itbisRate, setItbisRate] = useState('18');
  const [showCheckout, setShowCheckout] = useState(false);
  // Note: scanMode was removed — it was declared but never used (DEAD-1)

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCedula, setCustomerCedula] = useState('');

  // Cash
  const [amountReceived, setAmountReceived] = useState('');

  // Financing
  const [downPayment, setDownPayment] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('5');
  const [installmentCount, setInstallmentCount] = useState('6');
  const [paymentPeriod, setPaymentPeriod] = useState<PaymentPeriod>('monthly');

  // Credit
  const [creditAdvance, setCreditAdvance] = useState('0');

  // Trade-In
  const [tradeInEnabled, setTradeInEnabled] = useState(false);
  const [tradeInDevices, setTradeInDevices] = useState<TradeInDevice[]>([]);
  const [showTradeInPicker, setShowTradeInPicker] = useState(false);

  // Trade-in devices from purchases (registered via Trade-In module)
  const recentTradeIns = useMemo(() => {
    return inventory.filter(i => i.status === 'disponible' && i.purchase_id);
  }, [inventory]);

  const addTradeInManual = () => {
    setTradeInDevices(prev => [...prev, {
      brand: '', model: '', imei: '', color: '', condition: 'bueno', batteryHealth: '', value: '',
    }]);
  };

  const addTradeInFromInventory = (item: InventoryItem) => {
    if (tradeInDevices.some(t => t.inventoryItemId === item.id)) {
      toast.error('Este equipo ya está agregado como trade-in');
      return;
    }
    setTradeInDevices(prev => [...prev, {
      brand: item.product?.brand || '',
      model: item.product?.name || '',
      imei: item.imei || '',
      color: item.product?.color || '',
      condition: item.condition,
      batteryHealth: item.battery_health?.toString() || '',
      value: item.purchase_cost.toString(),
      inventoryItemId: item.id,
    }]);
    setShowTradeInPicker(false);
  };

  const removeTradeIn = (index: number) => {
    setTradeInDevices(prev => prev.filter((_, i) => i !== index));
  };

  const updateTradeIn = (index: number, field: keyof TradeInDevice, value: string) => {
    setTradeInDevices(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  // Filtered inventory
  const filtered = useMemo(() => {
    if (!search) return availableInventory;
    const q = search.toLowerCase();
    return availableInventory.filter((item) => {
      const p = item.product;
      return (
        p?.brand.toLowerCase().includes(q) ||
        p?.name.toLowerCase().includes(q) ||
        item.imei?.toLowerCase().includes(q) ||
        item.serial?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q) ||
        p?.color.toLowerCase().includes(q)
      );
    });
  }, [availableInventory, search]);

  // Cart calculations
  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const itbisPercent = parseFloat(itbisRate) || 0;
  const itbisAmount = applyItbis ? subtotal * (itbisPercent / 100) : 0;
  const tradeInTotal = tradeInEnabled ? tradeInDevices.reduce((s, t) => s + (parseFloat(t.value) || 0), 0) : 0;
  const total = subtotal + itbisAmount - tradeInTotal;

  const addToCart = useCallback((item: InventoryItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.inventoryItem.id === item.id);
      if (existing) {
        if (existing.quantity < (item.quantity || 1)) {
          toast.success(`${item.product?.brand} ${item.product?.name} — cantidad: ${existing.quantity + 1}`);
          return prev.map((c) => c.inventoryItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
        } else {
          toast.error('No hay más stock disponible');
          return prev;
        }
      }
      toast.success(`${item.product?.brand} ${item.product?.name} agregado`);
      return [...prev, { inventoryItem: item, price: item.sale_price, quantity: 1 }];
    });
  }, []);

  const handleBarcodeScan = useCallback((code: string) => {
    const item = availableInventory.find((i) => i.barcode === code || i.imei === code || i.serial === code);
    if (item) {
      playSuccess();
      addToCart(item);
    } else {
      playError();
      toast.error(`Producto no encontrado: ${code}`);
    }
  }, [availableInventory, addToCart]);

  const updateQuantity = (id: string, qty: number) => {
    const item = cart.find((c) => c.inventoryItem.id === id);
    if (!item) return;
    const maxQty = item.inventoryItem.quantity;
    const newQty = Math.max(1, Math.min(qty, maxQty));
    setCart((prev) => prev.map((c) => c.inventoryItem.id === id ? { ...c, quantity: newQty } : c));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.inventoryItem.id !== id));
  };

  const updatePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((c) => c.inventoryItem.id === id ? { ...c, price } : c));
  };

  // Get period rate and installment dates
  const getPeriodConfig = (period: PaymentPeriod) => {
    const monthlyR = (parseFloat(monthlyRate) || 5) / 100;
    switch (period) {
      case 'weekly': return { rate: monthlyR / 4, periodLabel: 'semanas', addDays: 7 };
      case 'biweekly': return { rate: monthlyR / 2, periodLabel: 'quincenas', addDays: 15 };
      default: return { rate: monthlyR, periodLabel: 'meses', addDays: 0 }; // addDays=0 means use month increment
    }
  };

  // Amortization table (French method)
  const amortization = useMemo((): LoanInstallment[] => {
    if (paymentMethod !== 'financing') return [];
    const dp = parseFloat(downPayment) || 0;
    const principal = total - dp;
    if (principal <= 0) return [];
    const config = getPeriodConfig(paymentPeriod);
    const r = config.rate;
    const n = parseInt(installmentCount) || 6;
    const pmt = principal * r / (1 - Math.pow(1 + r, -n));

    const rows: LoanInstallment[] = [];
    let balance = principal;
    const startDate = new Date();

    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      const principalPart = pmt - interest;
      const closing = balance - principalPart;
      const dueDate = new Date(startDate);
      if (config.addDays > 0) {
        dueDate.setDate(dueDate.getDate() + config.addDays * i);
      } else {
        dueDate.setMonth(dueDate.getMonth() + i);
      }

      rows.push({
        id: '', loan_id: '', installment_number: i,
        due_date: dueDate.toISOString().split('T')[0],
        opening_balance: Math.round(balance * 100) / 100,
        interest_amount: Math.round(interest * 100) / 100,
        principal_amount: Math.round(principalPart * 100) / 100,
        closing_balance: Math.max(0, Math.round(closing * 100) / 100),
        scheduled_payment: Math.round(pmt * 100) / 100,
        paid_amount: 0, is_paid: false,
      });
      balance = closing;
    }
    return rows;
  }, [paymentMethod, downPayment, monthlyRate, installmentCount, total, paymentPeriod]);

  const canCheckout = cart.length > 0;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const periodLabels: Record<PaymentPeriod, string> = { weekly: 'semanal', biweekly: 'quincenal', monthly: 'mensual' };

  const handleCheckout = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const finalCustomerName = customerName.trim() || 'Cliente General';

      const saleItems = cart.map((c) => ({
        inventoryItemId: c.inventoryItem.id,
        brand: c.inventoryItem.product?.brand || '',
        model: c.inventoryItem.product?.name || '',
        imei: c.inventoryItem.imei,
        color: c.inventoryItem.product?.color,
        unitPrice: c.price,
        quantity: c.quantity,
      }));

      let saleAmountReceived = 0;
      let saleChange = 0;

      if (paymentMethod === 'cash') {
        const received = parseFloat(amountReceived) || 0;
        if (received < total) {
          toast.error('El monto recibido es menor al total');
          return;
        }
        saleAmountReceived = received;
        saleChange = received - total;
      } else if (paymentMethod === 'financing') {
        saleAmountReceived = parseFloat(downPayment) || 0;
      } else {
        saleAmountReceived = parseFloat(creditAdvance) || 0;
      }

      // Build trade-in notes
      let saleNotes = applyItbis ? `ITBIS ${itbisRate}% incluido: ${formatCurrency(itbisAmount)}` : '';
      if (tradeInEnabled && tradeInDevices.length > 0) {
        const tradeInNote = tradeInDevices.map(t =>
          `Trade-In: ${t.brand} ${t.model}${t.imei ? ` (IMEI: ${t.imei})` : ''} — ${formatCurrency(parseFloat(t.value) || 0)}`
        ).join(' | ');
        saleNotes = saleNotes ? `${saleNotes} | ${tradeInNote}` : tradeInNote;
      }

      const sale = await createSale(
        {
          customer_name: finalCustomerName,
          customer_phone: customerPhone,
          customer_cedula: customerCedula,
          total_amount: total,
          amount_received: saleAmountReceived,
          change_given: saleChange,
          payment_method: paymentMethod,
          sold_at: new Date().toISOString(),
          notes: saleNotes || undefined,
        },
        saleItems
      );

      upsertCustomer(finalCustomerName, customerPhone, customerCedula);

      // Register trade-in devices to inventory via purchase
      if (tradeInEnabled && tradeInDevices.length > 0) {
        const manualTradeIns = tradeInDevices.filter(t => !t.inventoryItemId && t.brand && t.model);
        if (manualTradeIns.length > 0) {
          await createPurchase({
            supplierName: finalCustomerName,
            supplierPhone: customerPhone,
            supplierCedula: customerCedula,
            notes: `Trade-In desde venta #${sale.id.slice(0, 8).toUpperCase()}`,
            items: manualTradeIns.map(t => ({
              category: 'celular' as const,
              brand: t.brand,
              model: t.model,
              imei: t.imei || undefined,
              color: t.color || undefined,
              condition: t.condition,
              batteryHealth: t.batteryHealth ? parseInt(t.batteryHealth) : undefined,
              isNew: false,
              purchaseCost: parseFloat(t.value) || 0,
              salePrice: parseFloat(t.value) || 0,
            })),
          });
        }
      }

      let createdInstallments: LoanInstallment[] | undefined;
      if (paymentMethod === 'financing' && amortization.length > 0) {
        const dp = parseFloat(downPayment) || 0;
        const financedAmount = total - dp;
        await createLoan(
          {
            customer_name: finalCustomerName, customer_phone: customerPhone, customer_cedula: customerCedula,
            device_brand: cart[0]?.inventoryItem.product?.brand || '', device_model: cart[0]?.inventoryItem.product?.name || '',
            imei: cart[0]?.inventoryItem.imei,
            total_amount: total, down_payment: dp, financed_amount: financedAmount,
            monthly_rate: parseFloat(monthlyRate) || 5, installments: parseInt(installmentCount) || 6,
            monthly_payment: amortization[0]?.scheduled_payment || 0,
            balance_due: financedAmount, paid_amount: 0, status: 'activo',
            start_date: new Date().toISOString().split('T')[0],
            sale_id: sale.id,
            payment_period: paymentPeriod,
          },
          amortization
        );
        createdInstallments = amortization;
      }

      if (paymentMethod === 'credit') {
        const advance = parseFloat(creditAdvance) || 0;
        await createAR({
          customer_name: finalCustomerName, customer_phone: customerPhone, customer_cedula: customerCedula,
          description: `Venta a crédito: ${cart.map((c) => `${c.inventoryItem.product?.brand} ${c.inventoryItem.product?.name}`).join(', ')}`,
          device_brand: cart[0]?.inventoryItem.product?.brand,
          device_model: cart[0]?.inventoryItem.product?.name,
          imei: cart[0]?.inventoryItem.imei,
          original_amount: total, paid_amount: advance, balance_due: total - advance,
          status: advance > 0 ? 'parcial' : 'pendiente',
          sale_id: sale.id,
        });
      }

      const firstItem = cart[0]?.inventoryItem;
      const receiptOptions: SaleReceiptOptions = {
        batteryHealth: firstItem?.battery_health,
        condition: firstItem?.condition,
        grade: firstItem?.grade,
        warrantyText: tenant?.warranty_text,
        tradeInDevices: tradeInEnabled ? tradeInDevices.map(t => ({
          brand: t.brand, model: t.model, imei: t.imei, value: parseFloat(t.value) || 0,
          condition: t.condition, batteryHealth: t.batteryHealth ? parseInt(t.batteryHealth) : undefined,
        })) : undefined,
        tradeInTotal: tradeInEnabled ? tradeInTotal : undefined,
      };
      printSaleReceipt(sale, createdInstallments, tenant?.name, receiptOptions, tenant?.logo_url || undefined);

      toast.success('Venta registrada exitosamente');
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setShowCheckout(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCedula('');
    setAmountReceived('');
    setDownPayment('');
    setCreditAdvance('0');
    setPaymentMethod('cash');
    setPaymentPeriod('monthly');
    setApplyItbis(false);
    setTradeInEnabled(false);
    setTradeInDevices([]);
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Punto de Venta</h1>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <Button onClick={() => setShowCheckout(true)} size="sm" className="shrink-0">
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                Cobrar ({cart.length})
              </Button>
            )}
          </div>
        </div>

        {/* Barcode scanner - always visible */}
        <div className="rounded-lg border bg-card p-3">
          <BarcodeScanner onScan={handleBarcodeScan} placeholder="Escanea código de barras y presiona Enter para agregar al carrito..." />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-3">
          {/* Inventory List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo, IMEI, SKU o código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 sm:gap-3">
              {filtered.map((item) => {
                const inCart = cart.some((c) => c.inventoryItem.id === item.id);
                const conditionLabels: Record<string, string> = {
                  nuevo: 'Nuevo', usado: 'Usado', reacondicionado: 'Reacondicionado', dañado: 'Dañado',
                };
                const conditionColors: Record<string, string> = {
                  nuevo: 'bg-green-500/10 text-green-700 border-green-500/30',
                  usado: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30',
                  reacondicionado: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
                  dañado: 'bg-red-500/10 text-red-700 border-red-500/30',
                };
                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all duration-150 hover:border-primary/40 hover:shadow-md ${inCart ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : ''}`}
                    onClick={() => addToCart(item)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{item.product?.brand} {item.product?.name}</p>
                          <p className="text-[11px] text-muted-foreground">{item.product?.color}{item.product?.capacity ? ` · ${item.product.capacity}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {inCart && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </div>
                      {/* Identifiers */}
                      <div className="mt-1.5 space-y-0.5">
                        {item.imei && (
                          <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <span className="font-semibold text-foreground/70">IMEI:</span> {item.imei}
                          </p>
                        )}
                        {item.serial && (
                          <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <span className="font-semibold text-foreground/70">Serial:</span> {item.serial}
                          </p>
                        )}
                        {item.barcode && (
                          <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <span className="font-semibold text-foreground/70">CB:</span> {item.barcode}
                          </p>
                        )}
                      </div>
                      {/* Condition + Details */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Badge className={`text-[10px] border ${conditionColors[item.condition] || 'bg-muted text-muted-foreground'}`} variant="outline">
                          {conditionLabels[item.condition] || item.condition}
                        </Badge>
                        {item.is_new && <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30" variant="outline">Nuevo</Badge>}
                        {item.grade && <Badge variant="secondary" className="text-[10px]">{item.grade}</Badge>}
                        {item.battery_health != null && (
                          <Badge variant="outline" className="text-[10px]">🔋 {item.battery_health}%</Badge>
                        )}
                        {(item.quantity || 1) > 1 && (
                          <Badge variant="outline" className="text-[10px]">Stock: {item.quantity}</Badge>
                        )}
                      </div>
                      {/* Price */}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">{formatCurrency(item.sale_price)}</span>
                        {item.min_price > 0 && item.min_price < item.sale_price && (
                          <span className="text-[10px] text-muted-foreground">Mín: {formatCurrency(item.min_price)}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="col-span-full empty-state">
                  <ShoppingCart className="empty-state-icon" />
                  <p className="text-sm">No se encontraron productos disponibles</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    Carrito
                  </span>
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{cart.length} {cart.length === 1 ? 'item' : 'items'}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">Carrito vacío</p>
                    <p className="text-xs mt-1">Escanea o selecciona productos</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cart.map((c, idx) => {
                      const maxQty = c.inventoryItem.quantity || 1;
                      return (
                        <div key={c.inventoryItem.id} className="p-3 space-y-2 hover:bg-muted/30 transition-colors">
                          {/* Row 1: Product info + delete */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold truncate">
                                {c.inventoryItem.product?.brand} {c.inventoryItem.product?.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-muted-foreground">{c.inventoryItem.product?.color}</span>
                                {c.inventoryItem.product?.capacity && (
                                  <span className="text-[11px] text-muted-foreground">· {c.inventoryItem.product.capacity}</span>
                                )}
                                {c.inventoryItem.imei && (
                                  <span className="text-[10px] font-mono text-muted-foreground">IMEI: {c.inventoryItem.imei}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeFromCart(c.inventoryItem.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          {/* Row 2: Qty controls + Price + Subtotal */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => updateQuantity(c.inventoryItem.id, c.quantity - 1)}
                                disabled={c.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-7 text-center text-sm font-medium">{c.quantity}</span>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                onClick={() => updateQuantity(c.inventoryItem.id, c.quantity + 1)}
                                disabled={c.quantity >= maxQty}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {c.inventoryItem.min_price > 0 && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 shrink-0"
                                  title={`Precio mínimo: ${formatCurrency(c.inventoryItem.min_price)}`}
                                  onClick={() => updatePrice(c.inventoryItem.id, c.inventoryItem.min_price)}
                                >
                                  <Tag className="h-3 w-3" />
                                </Button>
                              )}
                              <Input
                                type="number"
                                value={c.price}
                                onChange={(e) => updatePrice(c.inventoryItem.id, parseFloat(e.target.value) || 0)}
                                className="w-24 h-7 text-right text-sm"
                              />
                            </div>
                          </div>
                          {c.quantity > 1 && (
                            <div className="text-right">
                              <span className="text-xs font-medium text-primary">Subtotal: {formatCurrency(c.price * c.quantity)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Totals section */}
                    <div className="p-3 space-y-3 bg-muted/20">
                      {/* ITBIS Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="itbis" className="text-sm">Aplicar ITBIS</Label>
                        <div className="flex items-center gap-2">
                          {applyItbis && (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                value={itbisRate}
                                onChange={(e) => setItbisRate(e.target.value)}
                                className="w-14 h-6 text-right text-xs"
                                min="0"
                                max="100"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          )}
                          <Switch id="itbis" checked={applyItbis} onCheckedChange={setApplyItbis} />
                        </div>
                      </div>

                      <Separator />

                      {/* Trade-In Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="tradein" className="text-sm flex items-center gap-1.5">
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                          Trade-In
                        </Label>
                        <Switch id="tradein" checked={tradeInEnabled} onCheckedChange={setTradeInEnabled} />
                      </div>

                      <Separator />

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>{formatCurrency(subtotal)}</span>
                        </div>
                        {applyItbis && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>ITBIS ({itbisRate}%)</span>
                            <span>{formatCurrency(itbisAmount)}</span>
                          </div>
                        )}
                        {tradeInEnabled && tradeInTotal > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Trade-In ({tradeInDevices.length} equipo{tradeInDevices.length !== 1 ? 's' : ''})</span>
                            <span>-{formatCurrency(tradeInTotal)}</span>
                          </div>
                        )}
                        <Separator className="my-1" />
                        <div className="flex justify-between font-bold text-lg pt-1">
                          <span>Total</span>
                          <span className="text-primary">{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Proceder al cobro
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Dialog */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Completar Venta — {formatCurrency(total)}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Cliente</h3>
                <CustomerAutocomplete
                  customers={customers}
                  customerName={customerName}
                  customerPhone={customerPhone}
                  customerCedula={customerCedula}
                  onSelectCustomer={(c) => {
                    setCustomerName(c.full_name);
                    setCustomerPhone(c.phone || '');
                    setCustomerCedula(c.cedula || '');
                  }}
                  onNameChange={setCustomerName}
                  onPhoneChange={setCustomerPhone}
                  onCedulaChange={setCustomerCedula}
                />
              </div>

              <Separator />

              {/* Payment method */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Método de Pago</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash' as const, label: 'Contado', icon: Banknote },
                    { value: 'financing' as const, label: 'Financiado', icon: CreditCard },
                    { value: 'credit' as const, label: 'Crédito', icon: FileText },
                  ].map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${paymentMethod === pm.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/30'
                        }`}
                    >
                      <pm.icon className="h-5 w-5" />
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash fields */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <Label>Monto Recibido</Label>
                    <Input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={total.toString()}
                    />
                  </div>
                  {parseFloat(amountReceived) >= total && (
                    <div className="flex justify-between rounded-lg bg-status-ok-bg p-3 text-sm">
                      <span className="font-medium">Cambio</span>
                      <span className="font-bold text-status-ok">{formatCurrency(parseFloat(amountReceived) - total)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Financing fields */}
              {paymentMethod === 'financing' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Inicial (RD$)</Label>
                      <Input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="0" />
                    </div>
                    <div>
                      <Label>Tasa Mensual %</Label>
                      <Input type="number" value={monthlyRate} onChange={(e) => setMonthlyRate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Período de Pago</Label>
                      <Select value={paymentPeriod} onValueChange={(v) => setPaymentPeriod(v as PaymentPeriod)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quincenal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Cuotas</Label>
                      <Select value={installmentCount} onValueChange={setInstallmentCount}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(paymentPeriod === 'weekly' ? [4, 8, 12, 16, 24, 48] : paymentPeriod === 'biweekly' ? [2, 4, 6, 12, 18, 24] : [3, 6, 9, 12, 18, 24]).map((n) => (
                            <SelectItem key={n} value={n.toString()}>{n} {periodLabels[paymentPeriod] === 'mensual' ? 'meses' : periodLabels[paymentPeriod] === 'semanal' ? 'semanas' : 'quincenas'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {amortization.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monto financiado</span>
                        <span className="font-medium">{formatCurrency(total - (parseFloat(downPayment) || 0))}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cuota {periodLabels[paymentPeriod]}</span>
                        <span className="font-bold text-primary">{formatCurrency(amortization[0]?.scheduled_payment || 0)}</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">#</th>
                              <th className="p-2 text-left">Fecha</th>
                              <th className="p-2 text-right">Cuota</th>
                              <th className="p-2 text-right">Capital</th>
                              <th className="p-2 text-right">Interés</th>
                              <th className="p-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {amortization.map((row) => (
                              <tr key={row.installment_number} className="border-t border-border/50">
                                <td className="p-2">{row.installment_number}</td>
                                <td className="p-2">{row.due_date}</td>
                                <td className="p-2 text-right">{formatCurrency(row.scheduled_payment)}</td>
                                <td className="p-2 text-right">{formatCurrency(row.principal_amount)}</td>
                                <td className="p-2 text-right">{formatCurrency(row.interest_amount)}</td>
                                <td className="p-2 text-right">{formatCurrency(row.closing_balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Credit fields */}
              {paymentMethod === 'credit' && (
                <div className="space-y-3">
                  <div>
                    <Label>Abono Inicial (RD$)</Label>
                    <Input type="number" value={creditAdvance} onChange={(e) => setCreditAdvance(e.target.value)} placeholder="0" />
                  </div>
                  <div className="flex justify-between rounded-lg bg-status-waiting-bg p-3 text-sm">
                    <span>Pendiente por cobrar</span>
                    <span className="font-bold text-status-waiting">{formatCurrency(total - (parseFloat(creditAdvance) || 0))}</span>
                  </div>
                </div>
              )}

              {/* Trade-In Section */}
              {tradeInEnabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-primary" />
                        Equipos Trade-In
                      </h3>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setShowTradeInPicker(true)}>
                          Seleccionar
                        </Button>
                        <Button size="sm" variant="outline" onClick={addTradeInManual}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Manual
                        </Button>
                      </div>
                    </div>

                    {tradeInDevices.map((device, idx) => (
                      <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {device.inventoryItemId ? '📦 Desde inventario' : '✏️ Manual'}
                          </span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeTradeIn(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                        {device.inventoryItemId ? (
                          <div className="text-sm">
                            <p className="font-medium">{device.brand} {device.model}</p>
                            {device.imei && <p className="text-xs text-muted-foreground font-mono">IMEI: {device.imei}</p>}
                            <p className="text-xs text-muted-foreground">{device.condition}{device.batteryHealth ? ` · 🔋${device.batteryHealth}%` : ''}</p>
                            <div className="mt-1">
                              <Label className="text-xs">Valor Trade-In (RD$)</Label>
                              <Input type="number" value={device.value} onChange={(e) => updateTradeIn(idx, 'value', e.target.value)} className="h-8 text-sm" />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Marca *</Label>
                              <Input value={device.brand} onChange={(e) => updateTradeIn(idx, 'brand', e.target.value)} className="h-8 text-sm" placeholder="Ej: Apple" />
                            </div>
                            <div>
                              <Label className="text-xs">Modelo *</Label>
                              <Input value={device.model} onChange={(e) => updateTradeIn(idx, 'model', e.target.value)} className="h-8 text-sm" placeholder="Ej: iPhone 13" />
                            </div>
                            <div>
                              <Label className="text-xs">IMEI</Label>
                              <Input value={device.imei} onChange={(e) => updateTradeIn(idx, 'imei', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Color</Label>
                              <Input value={device.color} onChange={(e) => updateTradeIn(idx, 'color', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Condición</Label>
                              <Select value={device.condition} onValueChange={(v) => updateTradeIn(idx, 'condition', v)}>
                                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="excelente">Excelente</SelectItem>
                                  <SelectItem value="bueno">Bueno</SelectItem>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="malo">Malo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Batería %</Label>
                              <Input type="number" value={device.batteryHealth} onChange={(e) => updateTradeIn(idx, 'batteryHealth', e.target.value)} className="h-8 text-sm" placeholder="85" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Valor Trade-In (RD$) *</Label>
                              <Input type="number" value={device.value} onChange={(e) => updateTradeIn(idx, 'value', e.target.value)} className="h-8 text-sm" placeholder="Monto a descontar" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {tradeInDevices.length > 0 && (
                      <div className="flex justify-between rounded-lg bg-green-500/10 p-3 text-sm">
                        <span className="font-medium">Descuento Trade-In</span>
                        <span className="font-bold text-green-600">-{formatCurrency(tradeInTotal)}</span>
                      </div>
                    )}

                    {tradeInDevices.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Agrega equipos que el cliente entrega como parte de pago
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowCheckout(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button onClick={handleCheckout} disabled={isSubmitting}>
                <Printer className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Procesando...' : 'Registrar e Imprimir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Trade-In Picker Dialog */}
        <Dialog open={showTradeInPicker} onOpenChange={setShowTradeInPicker}>
          <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Seleccionar equipo Trade-In</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">Equipos registrados desde el módulo Trade-In disponibles en inventario:</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {recentTradeIns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No hay equipos de trade-in disponibles</p>
              ) : (
                recentTradeIns.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addTradeInFromInventory(item)}
                    className="w-full text-left rounded-lg border p-3 hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{item.product?.brand} {item.product?.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {item.imei && <span className="font-mono">IMEI: {item.imei}</span>}
                      <span>{item.condition}</span>
                      {item.battery_health && <span>🔋{item.battery_health}%</span>}
                    </div>
                    <p className="text-xs mt-1">Costo: <strong>{formatCurrency(item.purchase_cost)}</strong></p>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
