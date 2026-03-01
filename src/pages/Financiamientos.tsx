import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { useRole } from '@/hooks/useRole';
import { formatCurrency } from '@/lib/currency';
import { playSuccess, playError } from '@/lib/sounds';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CreditCard, Search, Eye, CheckCircle, Zap, AlertTriangle, Plus, Printer, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Loan, LoanInstallment, PaymentPeriod } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  activo: { label: 'Activo', class: 'bg-status-process-bg text-status-process' },
  al_dia: { label: 'Al Día', class: 'bg-status-ok-bg text-status-ok' },
  atrasado: { label: 'Atrasado', class: 'bg-status-late-bg text-status-late' },
  liquidado: { label: 'Liquidado', class: 'bg-status-done-bg text-status-done' },
  cancelado: { label: 'Cancelado', class: 'bg-muted text-muted-foreground' },
};

const PERIOD_LABELS: Record<PaymentPeriod, string> = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };

export default function Financiamientos() {
  const { loans, createLoan, payInstallment, liquidateLoan, availableInventory } = useStore();
  const { canViewFinancials } = useRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);

  const filteredInventory = useMemo(() => {
    if (!inventorySearch) return availableInventory.slice(0, 20);
    const q = inventorySearch.toLowerCase();
    return availableInventory.filter((item) => {
      const p = item.product;
      return (
        p?.brand.toLowerCase().includes(q) ||
        p?.name.toLowerCase().includes(q) ||
        item.imei?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q)
      );
    }).slice(0, 20);
  }, [availableInventory, inventorySearch]);

  const selectInventoryItem = (item: typeof availableInventory[0]) => {
    setForm((f) => ({
      ...f,
      deviceBrand: item.product?.brand || '',
      deviceModel: item.product?.name || '',
      imei: item.imei || '',
      totalAmount: item.sale_price.toString(),
    }));
    setShowInventoryPicker(false);
    setInventorySearch('');
  };

  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerCedula: '',
    deviceBrand: '', deviceModel: '', imei: '',
    totalAmount: '', downPayment: '', monthlyRate: '5', installments: '6',
    startDate: new Date().toISOString().split('T')[0],
    paymentPeriod: 'monthly' as PaymentPeriod,
  });

  const filtered = useMemo(() => {
    return loans.filter((l) => {
      const matchesSearch = !search || l.customer_name.toLowerCase().includes(search.toLowerCase()) || l.device_brand.toLowerCase().includes(search.toLowerCase()) || l.device_model.toLowerCase().includes(search.toLowerCase()) || (l.imei && l.imei.includes(search));
      const matchesStatus = statusFilter === 'todos' || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [loans, search, statusFilter]);

  const getPeriodConfig = (period: PaymentPeriod, monthlyRateStr: string) => {
    const monthlyR = (parseFloat(monthlyRateStr) || 5) / 100;
    switch (period) {
      case 'weekly': return { rate: monthlyR / 4, addDays: 7 };
      case 'biweekly': return { rate: monthlyR / 2, addDays: 15 };
      default: return { rate: monthlyR, addDays: 0 };
    }
  };

  const amortizationPreview = useMemo((): LoanInstallment[] => {
    const total = parseFloat(form.totalAmount) || 0;
    const dp = parseFloat(form.downPayment) || 0;
    const principal = total - dp;
    if (principal <= 0) return [];
    const config = getPeriodConfig(form.paymentPeriod, form.monthlyRate);
    const r = config.rate;
    const n = parseInt(form.installments) || 6;
    const pmt = principal * r / (1 - Math.pow(1 + r, -n));
    const rows: LoanInstallment[] = [];
    let balance = principal;
    const startDate = new Date(form.startDate);
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
  }, [form]);

  const periodUnitLabels: Record<PaymentPeriod, string> = { weekly: 'semanas', biweekly: 'quincenas', monthly: 'meses' };
  const periodCuotaLabels: Record<PaymentPeriod, string> = { weekly: 'semanal', biweekly: 'quincenal', monthly: 'mensual' };

  const handleCreate = () => {
    if (!form.customerName || !form.deviceBrand || !form.deviceModel || !form.totalAmount) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    const total = parseFloat(form.totalAmount) || 0;
    const dp = parseFloat(form.downPayment) || 0;
    const financed = total - dp;
    createLoan(
      {
        customer_name: form.customerName, customer_phone: form.customerPhone, customer_cedula: form.customerCedula,
        device_brand: form.deviceBrand, device_model: form.deviceModel, imei: form.imei,
        total_amount: total, down_payment: dp, financed_amount: financed,
        monthly_rate: parseFloat(form.monthlyRate) || 5, installments: parseInt(form.installments) || 6,
        monthly_payment: amortizationPreview[0]?.scheduled_payment || 0,
        balance_due: financed, paid_amount: 0, status: 'activo',
        start_date: form.startDate,
        payment_period: form.paymentPeriod,
      },
      amortizationPreview
    );
    toast.success('Financiamiento creado');
    setShowCreate(false);
    setForm({ customerName: '', customerPhone: '', customerCedula: '', deviceBrand: '', deviceModel: '', imei: '', totalAmount: '', downPayment: '', monthlyRate: '5', installments: '6', startDate: new Date().toISOString().split('T')[0], paymentPeriod: 'monthly' });
  };

  const handlePayInstallment = async (loanId: string, instId: string) => {
    try {
      await payInstallment(loanId, instId);
      toast.success('Cuota pagada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al pagar cuota');
    }
  };

  const handleLiquidate = async (loanId: string) => {
    try {
      await liquidateLoan(loanId);
      setSelectedLoan(null);
      toast.success('Préstamo liquidado anticipadamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al liquidar préstamo');
    }
  };

  const currentSelectedLoan = selectedLoan ? loans.find((l) => l.id === selectedLoan.id) || null : null;

  const printAmortizationTable = (loan: Loan) => {
    const installments = loan.loan_installments || [];
    const periodLabel = PERIOD_LABELS[loan.payment_period as PaymentPeriod || 'monthly'];
    const rows = installments.map((inst) => `
      <tr style="${inst.is_paid ? 'opacity:0.5' : ''}">
        <td>${inst.installment_number}</td>
        <td>${format(new Date(inst.due_date), 'dd/MM/yyyy')}</td>
        <td style="text-align:right">${formatCurrency(inst.scheduled_payment)}</td>
        <td style="text-align:right">${formatCurrency(inst.principal_amount)}</td>
        <td style="text-align:right">${formatCurrency(inst.interest_amount)}</td>
        <td style="text-align:right">${formatCurrency(inst.closing_balance)}</td>
        <td style="text-align:center">${inst.is_paid ? (inst.is_early_payment ? '✓ Liquidado' : '✓ Pagado') : 'Pendiente'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tabla de Amortización</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 15mm; color: #000; }
        .center { text-align: center; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        h2 { font-size: 13px; margin-bottom: 10px; }
        .info { margin: 10px 0; }
        .info p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; font-size: 10px; }
        th { background: #f0f0f0; font-weight: bold; }
        .sep { border-top: 1px dashed #000; margin: 10px 0; }
        .summary { margin-top: 10px; font-size: 11px; }
        @media print { @page { margin: 10mm; size: A4; } }
      </style></head><body>
        <div class="center">
          <h1>TABLA DE AMORTIZACIÓN</h1>
          <h2>${loan.device_brand} ${loan.device_model}</h2>
        </div>
        <div class="sep"></div>
        <div class="info">
          <p><b>Cliente:</b> ${loan.customer_name}</p>
          <p><b>Teléfono:</b> ${loan.customer_phone}</p>
          ${loan.imei ? `<p><b>IMEI:</b> ${loan.imei}</p>` : ''}
          <p><b>Período:</b> ${periodLabel}</p>
          <p><b>Tasa:</b> ${loan.monthly_rate}% mensual</p>
        </div>
        <div class="sep"></div>
        <div class="summary">
          <p><b>Monto Total:</b> ${formatCurrency(loan.total_amount)} · <b>Inicial:</b> ${formatCurrency(loan.down_payment)} · <b>Financiado:</b> ${formatCurrency(loan.financed_amount)}</p>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>Fecha</th><th style="text-align:right">Cuota</th><th style="text-align:right">Capital</th><th style="text-align:right">Interés</th><th style="text-align:right">Balance</th><th>Estado</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="sep"></div>
        <div class="center" style="margin-top:10px;font-size:10px">Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
      </body></html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const activeLoans = loans.filter((l) => !['liquidado', 'cancelado'].includes(l.status));
  const totalPending = activeLoans.reduce((s, l) => s + l.balance_due, 0);
  const overdueCount = loans.filter((l) => l.status === 'atrasado').length;

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Financiamientos</h1>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Crédito
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="kpi-card"><p className="text-xs text-muted-foreground">Créditos Activos</p><p className="text-2xl font-bold">{activeLoans.length}</p></div>
          <div className="kpi-card"><p className="text-xs text-muted-foreground">Saldo Pendiente Total</p><p className="text-2xl font-bold text-primary">{formatCurrency(totalPending)}</p></div>
          <div className="kpi-card"><p className="text-xs text-muted-foreground">Atrasados</p><p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-status-late' : 'text-status-ok'}`}>{overdueCount}</p></div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, equipo o IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="al_dia">Al Día</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="liquidado">Liquidado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead className="text-center">Período</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Cuotas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((loan) => {
                const paidCount = (loan.loan_installments || []).filter((i) => i.is_paid).length;
                const sb = STATUS_BADGES[loan.status] || STATUS_BADGES.activo;
                return (
                  <TableRow key={loan.id} className="table-row-hover cursor-pointer" onClick={() => setSelectedLoan(loan)}>
                    <TableCell>
                      <p className="font-medium text-sm">{loan.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{loan.customer_phone}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{loan.device_brand} {loan.device_model}</p>
                      {loan.imei && <p className="text-xs text-muted-foreground">{loan.imei}</p>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">{PERIOD_LABELS[loan.payment_period || 'monthly']}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(loan.total_amount)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(loan.balance_due)}</TableCell>
                    <TableCell className="text-center text-sm">{paidCount}/{loan.installments}</TableCell>
                    <TableCell><span className={`status-badge ${sb.class}`}>{sb.label}</span></TableCell>
                    <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay financiamientos</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!currentSelectedLoan} onOpenChange={(open) => !open && setSelectedLoan(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {currentSelectedLoan && (() => {
              const loan = currentSelectedLoan;
              const sb = STATUS_BADGES[loan.status] || STATUS_BADGES.activo;
              const installments = loan.loan_installments || [];
              const remainingBalance = installments.filter((i) => !i.is_paid).reduce((s, i) => s + i.principal_amount, 0);
              const totalInterest = installments.reduce((s, i) => s + i.interest_amount, 0);
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      {loan.device_brand} {loan.device_model}
                      <span className={`status-badge ${sb.class}`}>{sb.label}</span>
                      <Badge variant="outline" className="text-[10px]">{PERIOD_LABELS[loan.payment_period || 'monthly']}</Badge>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Cliente:</span> <strong>{loan.customer_name}</strong></div>
                    <div><span className="text-muted-foreground">Tel:</span> {loan.customer_phone}</div>
                    {loan.imei && <div><span className="text-muted-foreground">IMEI:</span> {loan.imei}</div>}
                    <div><span className="text-muted-foreground">Total:</span> {formatCurrency(loan.total_amount)}</div>
                    <div><span className="text-muted-foreground">Inicial:</span> {formatCurrency(loan.down_payment)}</div>
                    <div><span className="text-muted-foreground">Financiado:</span> {formatCurrency(loan.financed_amount)}</div>
                    <div><span className="text-muted-foreground">Tasa:</span> {loan.monthly_rate}% mensual</div>
                    <div><span className="text-muted-foreground">Saldo:</span> <strong className="text-primary">{formatCurrency(loan.balance_due)}</strong></div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-accent/50 p-3">
                    <div>
                      <p className="text-sm font-medium">💰 Ganancia por Intereses</p>
                      <p className="text-xs text-muted-foreground">Total de interés generado en este financiamiento</p>
                    </div>
                    <span className="text-lg font-bold text-primary">{formatCurrency(totalInterest)}</span>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => printAmortizationTable(loan)}>
                      <Printer className="mr-1 h-3.5 w-3.5" /> Imprimir Tabla
                    </Button>
                  </div>

                  <Separator />

                  {loan.status !== 'liquidado' && loan.status !== 'cancelado' && (
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div>
                        <p className="text-sm font-medium">Liquidación Anticipada</p>
                        <p className="text-xs text-muted-foreground">Pagar solo capital restante: {formatCurrency(remainingBalance)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleLiquidate(loan.id)}>
                        <Zap className="mr-1 h-3.5 w-3.5" /> Liquidar
                      </Button>
                    </div>
                  )}

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>#</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Cuota</TableHead>
                          <TableHead className="text-right">Capital</TableHead>
                          <TableHead className="text-right">Interés</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-center">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installments.map((inst) => {
                          const isOverdue = !inst.is_paid && new Date(inst.due_date) < new Date();
                          return (
                            <TableRow key={inst.id} className={inst.is_paid ? 'opacity-60' : ''}>
                              <TableCell className="text-sm">{inst.installment_number}</TableCell>
                              <TableCell className="text-sm">{format(new Date(inst.due_date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(inst.scheduled_payment)}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(inst.principal_amount)}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(inst.interest_amount)}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(inst.closing_balance)}</TableCell>
                              <TableCell className="text-center">
                                {inst.is_paid ? (
                                  <Badge variant="secondary" className="bg-status-ok-bg text-status-ok text-[10px]">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    {inst.is_early_payment ? 'Liquidado' : 'Pagado'}
                                  </Badge>
                                ) : isOverdue ? (
                                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handlePayInstallment(loan.id, inst.id); }}>
                                    <AlertTriangle className="mr-1 h-3 w-3" /> Vencida — Pagar
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handlePayInstallment(loan.id, inst.id); }}>
                                    Pagar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuevo Financiamiento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nombre del Cliente *</Label><Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} /></div>
                <div><Label>Teléfono</Label><Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} /></div>
                <div><Label>Cédula</Label><Input value={form.customerCedula} onChange={(e) => setForm((f) => ({ ...f, customerCedula: e.target.value }))} /></div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Equipo</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowInventoryPicker(!showInventoryPicker)}>
                    <Package className="mr-1.5 h-3.5 w-3.5" /> Buscar en Inventario
                  </Button>
                </div>
                {showInventoryPicker && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <BarcodeScanner
                      onScan={(code) => {
                        const item = availableInventory.find((i) => i.barcode === code || i.imei === code || i.serial === code);
                        if (item) {
                          playSuccess();
                          selectInventoryItem(item);
                          toast.success(`${item.product?.brand} ${item.product?.name} cargado`);
                        } else {
                          playError();
                          toast.error(`Producto no encontrado: ${code}`);
                        }
                      }}
                      placeholder="Escanear código de barras del producto..."
                    />
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="O buscar por marca, modelo, IMEI..."
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredInventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-md p-2 hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => selectInventoryItem(item)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.product?.brand} {item.product?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.product?.color}{item.product?.capacity ? ` · ${item.product.capacity}` : ''}
                              {item.imei ? ` · IMEI: ${item.imei}` : ''}
                            </p>
                          </div>
                          <span className="text-sm font-semibold shrink-0 ml-2">{formatCurrency(item.sale_price)}</span>
                        </div>
                      ))}
                      {filteredInventory.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-3">No se encontraron productos</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Marca *</Label><Input value={form.deviceBrand} onChange={(e) => setForm((f) => ({ ...f, deviceBrand: e.target.value }))} /></div>
                  <div><Label>Modelo *</Label><Input value={form.deviceModel} onChange={(e) => setForm((f) => ({ ...f, deviceModel: e.target.value }))} /></div>
                  <div className="col-span-2"><Label>IMEI</Label><Input value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} /></div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Monto Total *</Label><Input type="number" value={form.totalAmount} onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))} /></div>
                <div><Label>Inicial (RD$)</Label><Input type="number" value={form.downPayment} onChange={(e) => setForm((f) => ({ ...f, downPayment: e.target.value }))} /></div>
                <div><Label>Tasa Mensual %</Label><Input type="number" value={form.monthlyRate} onChange={(e) => setForm((f) => ({ ...f, monthlyRate: e.target.value }))} /></div>
                <div>
                  <Label>Período de Pago</Label>
                  <Select value={form.paymentPeriod} onValueChange={(v) => setForm((f) => ({ ...f, paymentPeriod: v as PaymentPeriod }))}>
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
                  <Select value={form.installments} onValueChange={(v) => setForm((f) => ({ ...f, installments: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(form.paymentPeriod === 'weekly' ? [4, 8, 12, 16, 24, 48] : form.paymentPeriod === 'biweekly' ? [2, 4, 6, 12, 18, 24] : [3, 6, 9, 12, 18, 24]).map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n} {periodUnitLabels[form.paymentPeriod]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fecha Inicio</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              </div>

              {amortizationPreview.length > 0 && (
                <>
                  <div className="flex justify-between text-sm rounded-lg bg-primary/10 p-3">
                    <span>Cuota {periodCuotaLabels[form.paymentPeriod]}:</span>
                    <span className="font-bold text-primary">{formatCurrency(amortizationPreview[0].scheduled_payment)}</span>
                  </div>
                  <div className="flex justify-between text-sm rounded-lg bg-accent/50 p-3">
                    <span>💰 Ganancia por Intereses:</span>
                    <span className="font-bold text-primary">{formatCurrency(amortizationPreview.reduce((s, r) => s + r.interest_amount, 0))}</span>
                  </div>
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs text-right">Cuota</TableHead>
                          <TableHead className="text-xs text-right">Capital</TableHead>
                          <TableHead className="text-xs text-right">Interés</TableHead>
                          <TableHead className="text-xs text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {amortizationPreview.map((r) => (
                          <TableRow key={r.installment_number}>
                            <TableCell className="text-xs">{r.installment_number}</TableCell>
                            <TableCell className="text-xs">{r.due_date}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(r.scheduled_payment)}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(r.principal_amount)}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(r.interest_amount)}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(r.closing_balance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Crear Financiamiento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
