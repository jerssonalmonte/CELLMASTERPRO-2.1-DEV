import { useState, useEffect, useMemo } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Building2, CalendarPlus, Calendar, Infinity, Pencil, Search,
  AlertTriangle, DollarSign, FileText, Eye, Plus, CheckCircle2,
  XCircle, Clock, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO, addMonths, addYears, differenceInDays, isBefore, isAfter, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const db = supabase as any;

type TabType = 'all' | 'alerts' | 'invoices';

export default function AdminMembresias() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Edit due date
  const [editDueTenant, setEditDueTenant] = useState<any>(null);
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);

  // Create invoice dialog
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [invoiceTenantId, setInvoiceTenantId] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState<Date | undefined>(undefined);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Org detail
  const [detailTenant, setDetailTenant] = useState<any>(null);
  const [detailInvoices, setDetailInvoices] = useState<any[]>([]);

  const loadData = async () => {
    const [t, inv] = await Promise.all([
      db.from('tenants').select('*').order('created_at', { ascending: false }),
      db.from('saas_invoices').select('*').order('due_date', { ascending: false }),
    ]);
    setTenants(t.data || []);
    setInvoices(inv.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const today = new Date();

  // Alerts: expiring within 7 days or overdue
  const alertTenants = useMemo(() => {
    return tenants.filter(t => {
      if (!t.next_due_date || t.subscription_plan === 'lifetime') return false;
      const due = parseISO(t.next_due_date);
      const daysLeft = differenceInDays(due, today);
      return daysLeft <= 7;
    }).map(t => {
      const due = parseISO(t.next_due_date);
      const daysLeft = differenceInDays(due, today);
      return { ...t, daysLeft };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [tenants]);

  const activeTenants = tenants.filter(t => t.subscription_status === 'activa');
  const suspendedTenants = tenants.filter(t => t.subscription_status === 'suspendida');
  const pendingTenants = tenants.filter(t => t.subscription_status === 'pendiente');
  const mrr = activeTenants.reduce((s, t) => s + (t.monthly_fee || 0), 0);

  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
  const paidInvoicesTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount_due || 0), 0);

  const filteredTenants = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.slug?.toLowerCase().includes(search.toLowerCase())
  );

  // Handlers
  const handleRenew = async (tenantId: string, period: 'month' | 'year') => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      const currentDue = tenant?.next_due_date ? parseISO(tenant.next_due_date) : new Date();
      const base = currentDue > new Date() ? currentDue : new Date();
      const newDue = period === 'month' ? addMonths(base, 1) : addYears(base, 1);
      const { error } = await db.from('tenants').update({
        subscription_status: 'activa',
        next_due_date: format(newDue, 'yyyy-MM-dd'),
      }).eq('id', tenantId);
      if (error) throw error;
      toast.success(`Renovada (${period === 'month' ? '+1 mes' : '+1 año'})`);
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error al renovar'); }
  };

  const handleUpdateDueDate = async () => {
    if (!editDueTenant || !editDueDate) return;
    try {
      const { error } = await db.from('tenants').update({
        next_due_date: format(editDueDate, 'yyyy-MM-dd'),
      }).eq('id', editDueTenant.id);
      if (error) throw error;
      toast.success('Fecha de corte actualizada');
      setEditDueTenant(null);
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceTenantId || !invoiceAmount || !invoiceDueDate) return;
    try {
      const { error } = await db.from('saas_invoices').insert({
        tenant_id: invoiceTenantId,
        amount_due: parseFloat(invoiceAmount),
        due_date: format(invoiceDueDate, 'yyyy-MM-dd'),
        notes: invoiceNotes || null,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Factura creada exitosamente');
      setInvoiceDialog(false);
      setInvoiceTenantId(''); setInvoiceAmount(''); setInvoiceDueDate(undefined); setInvoiceNotes('');
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error al crear factura'); }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      const { error } = await db.from('saas_invoices').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      }).eq('id', invoiceId);
      if (error) throw error;
      toast.success('Factura marcada como pagada');
      loadData();
      if (detailTenant) loadTenantDetail(detailTenant.id);
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  const loadTenantDetail = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    setDetailTenant(tenant);
    const { data } = await db.from('saas_invoices').select('*').eq('tenant_id', tenantId).order('due_date', { ascending: false });
    setDetailInvoices(data || []);
  };

  const handleChangeStatus = async (tenantId: string, val: string) => {
    try {
      const { error } = await db.from('tenants').update({ subscription_status: val }).eq('id', tenantId);
      if (error) throw error;
      toast.success(`Estado cambiado a "${val}"`);
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'all', label: 'Organizaciones', count: tenants.length },
    { key: 'alerts', label: 'Alertas', count: alertTenants.length },
    { key: 'invoices', label: 'Facturas', count: pendingInvoices.length },
  ];

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1440px] mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50">Membresías & Facturación</h1>
            <p className="text-sm text-slate-500 mt-0.5">Centro financiero de la plataforma</p>
          </div>
          <Button
            onClick={() => setInvoiceDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva Factura
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MiniKpi icon={DollarSign} label="MRR" value={formatCurrency(mrr)} color="emerald" />
          <MiniKpi icon={Building2} label="Activas" value={activeTenants.length} color="emerald" />
          <MiniKpi icon={Clock} label="Pendientes" value={pendingTenants.length} color="amber" />
          <MiniKpi icon={XCircle} label="Suspendidas" value={suspendedTenants.length} color="red" />
          <MiniKpi icon={Receipt} label="Cobrado Total" value={formatCurrency(paidInvoicesTotal)} color="blue" />
        </div>

        {/* Alert Banner */}
        {alertTenants.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">
                {alertTenants.length} membresía{alertTenants.length > 1 ? 's' : ''} requiere{alertTenants.length > 1 ? 'n' : ''} atención
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alertTenants.slice(0, 6).map(t => (
                <Badge
                  key={t.id}
                  variant="outline"
                  className={cn(
                    'text-[11px] cursor-pointer hover:scale-105 transition-transform',
                    t.daysLeft < 0 ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                    t.daysLeft <= 3 ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                    'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                  )}
                  onClick={() => loadTenantDetail(t.id)}
                >
                  {t.name} — {t.daysLeft < 0 ? `Vencida hace ${Math.abs(t.daysLeft)}d` : `${t.daysLeft}d restantes`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                  activeTab === tab.key
                    ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/[0.04]'
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    'ml-1.5 text-[10px] tabular-nums',
                    activeTab === tab.key ? 'text-blue-300' : 'text-slate-500'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab === 'all' && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Buscar organización..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-[12px] bg-white/[0.03] border-white/[0.06]"
              />
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'all' && (
          <OrgTable
            tenants={filteredTenants}
            loading={loading}
            onRenew={handleRenew}
            onEditDue={(t: any) => { setEditDueTenant(t); setEditDueDate(t.next_due_date ? parseISO(t.next_due_date) : undefined); }}
            onViewDetail={loadTenantDetail}
            onChangeStatus={handleChangeStatus}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsPanel
            alertTenants={alertTenants}
            onViewDetail={loadTenantDetail}
            onRenew={handleRenew}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesPanel
            invoices={invoices}
            tenants={tenants}
            onMarkPaid={handleMarkInvoicePaid}
          />
        )}

        {/* Edit Due Date Dialog */}
        <Dialog open={!!editDueTenant} onOpenChange={o => !o && setEditDueTenant(null)}>
          <DialogContent className="sm:max-w-sm bg-[hsl(220,20%,10%)] border-white/[0.08]">
            <DialogHeader><DialogTitle className="text-slate-100">Fecha de Corte — {editDueTenant?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="text-slate-300">Nueva fecha de corte</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal border-white/[0.08]", !editDueDate && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {editDueDate ? format(editDueDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={editDueDate} onSelect={setEditDueDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDueTenant(null)} className="border-white/[0.08]">Cancelar</Button>
              <Button onClick={handleUpdateDueDate} disabled={!editDueDate} className="bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Invoice Dialog */}
        <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
          <DialogContent className="sm:max-w-md bg-[hsl(220,20%,10%)] border-white/[0.08]">
            <DialogHeader><DialogTitle className="text-slate-100">Crear Factura Manual</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Organización</Label>
                <Select value={invoiceTenantId} onValueChange={setInvoiceTenantId}>
                  <SelectTrigger className="bg-white/[0.03] border-white/[0.08] mt-1">
                    <SelectValue placeholder="Seleccionar tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Monto (RD$)</Label>
                <Input
                  type="number"
                  value={invoiceAmount}
                  onChange={e => setInvoiceAmount(e.target.value)}
                  placeholder="1000"
                  className="bg-white/[0.03] border-white/[0.08] mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Fecha de vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal border-white/[0.08] mt-1", !invoiceDueDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {invoiceDueDate ? format(invoiceDueDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker mode="single" selected={invoiceDueDate} onSelect={setInvoiceDueDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-slate-300">Notas (opcional)</Label>
                <Textarea
                  value={invoiceNotes}
                  onChange={e => setInvoiceNotes(e.target.value)}
                  placeholder="Detalle del cobro..."
                  className="bg-white/[0.03] border-white/[0.08] mt-1 resize-none"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInvoiceDialog(false)} className="border-white/[0.08]">Cancelar</Button>
              <Button
                onClick={handleCreateInvoice}
                disabled={!invoiceTenantId || !invoiceAmount || !invoiceDueDate}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Crear Factura
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Org Detail Dialog */}
        <Dialog open={!!detailTenant} onOpenChange={o => !o && setDetailTenant(null)}>
          <DialogContent className="sm:max-w-2xl bg-[hsl(220,20%,10%)] border-white/[0.08] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                {detailTenant?.name}
              </DialogTitle>
            </DialogHeader>
            {detailTenant && (
              <div className="space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-[10px] text-slate-500 uppercase">Estado</p>
                    <StatusBadge status={detailTenant.subscription_status} />
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-[10px] text-slate-500 uppercase">Plan</p>
                    <p className="text-sm font-semibold text-slate-200 capitalize mt-0.5">{detailTenant.subscription_plan}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-[10px] text-slate-500 uppercase">Cuota</p>
                    <p className="text-sm font-semibold text-slate-200 mt-0.5">{formatCurrency(detailTenant.monthly_fee || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-[10px] text-slate-500 uppercase">Próximo Corte</p>
                    <p className="text-sm font-semibold text-slate-200 mt-0.5">
                      {detailTenant.next_due_date ? format(parseISO(detailTenant.next_due_date), 'd MMM yyyy', { locale: es }) : '—'}
                    </p>
                  </div>
                </div>

                {/* Invoice History */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Historial de Facturas
                  </h4>
                  {detailInvoices.length === 0 ? (
                    <p className="text-[13px] text-slate-500 text-center py-8">Sin facturas registradas</p>
                  ) : (
                    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-white/[0.02] hover:bg-white/[0.02]">
                            <TableHead className="text-[10px] uppercase text-slate-500">Fecha</TableHead>
                            <TableHead className="text-[10px] uppercase text-slate-500">Monto</TableHead>
                            <TableHead className="text-[10px] uppercase text-slate-500">Estado</TableHead>
                            <TableHead className="text-[10px] uppercase text-slate-500">Pagado</TableHead>
                            <TableHead className="text-[10px] uppercase text-slate-500">Notas</TableHead>
                            <TableHead className="text-[10px] uppercase text-slate-500 text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailInvoices.map(inv => (
                            <TableRow key={inv.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                              <TableCell className="text-[12px] text-slate-300 tabular-nums">
                                {format(parseISO(inv.due_date), 'd MMM yyyy', { locale: es })}
                              </TableCell>
                              <TableCell className="text-[12px] font-semibold text-slate-200 tabular-nums">
                                {formatCurrency(inv.amount_due)}
                              </TableCell>
                              <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                              <TableCell className="text-[12px] text-slate-400">
                                {inv.paid_at ? format(parseISO(inv.paid_at), 'd MMM yyyy', { locale: es }) : '—'}
                              </TableCell>
                              <TableCell className="text-[12px] text-slate-500 max-w-[120px] truncate">{inv.notes || '—'}</TableCell>
                              <TableCell className="text-right">
                                {inv.status !== 'paid' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                                    onClick={() => handleMarkInvoicePaid(inv.id)}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Pagada
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}

/* ─── Sub-components ─── */

function MiniKpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
  };
  return (
    <div className="admin-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-50 tabular-nums break-all">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    activa: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Activa' },
    pendiente: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Pendiente' },
    suspendida: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Suspendida' },
  };
  const s = map[status] || map.pendiente;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text} mt-1`}>
      {s.label}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    paid: { cls: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10', label: 'Pagada' },
    pending: { cls: 'border-amber-500/20 text-amber-400 bg-amber-500/10', label: 'Pendiente' },
    overdue: { cls: 'border-red-500/20 text-red-400 bg-red-500/10', label: 'Vencida' },
  };
  const s = map[status] || map.pending;
  return <Badge variant="outline" className={`text-[10px] ${s.cls}`}>{s.label}</Badge>;
}

function OrgTable({ tenants, loading, onRenew, onEditDue, onViewDetail, onChangeStatus }: any) {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-white/[0.02] hover:bg-white/[0.02]">
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Organización</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Estado</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold hidden sm:table-cell">Plan</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Cuota</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold hidden md:table-cell">Corte</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500">
              <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </TableCell></TableRow>
          ) : tenants.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500 text-[13px]">
              No se encontraron organizaciones
            </TableCell></TableRow>
          ) : tenants.map((t: any) => (
            <TableRow key={t.id} className="border-white/[0.04] hover:bg-white/[0.02] group">
              <TableCell className="font-medium text-[13px] text-slate-200">
                <div className="flex items-center gap-2.5">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt="" className="h-7 w-7 rounded-md object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center">
                      <Building2 className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                  )}
                  <span className="truncate">{t.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {t.subscription_plan === 'lifetime' ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400">
                    <Infinity className="h-3 w-3" /> Lifetime
                  </span>
                ) : (
                  <Select value={t.subscription_status || 'pendiente'} onValueChange={(val) => onChangeStatus(t.id, val)}>
                    <SelectTrigger className="h-7 w-[115px] text-[11px] bg-transparent border-white/[0.06]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activa"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Activa</span></SelectItem>
                      <SelectItem value="pendiente"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pendiente</span></SelectItem>
                      <SelectItem value="suspendida"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Suspendida</span></SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell className="text-[13px] capitalize text-slate-400 hidden sm:table-cell">{t.subscription_plan || 'mensual'}</TableCell>
              <TableCell className="text-[13px] text-slate-300 tabular-nums">
                {t.subscription_plan === 'lifetime' ? '—' : formatCurrency(t.monthly_fee || 1000)}
              </TableCell>
              <TableCell className="text-[13px] text-slate-400 tabular-nums hidden md:table-cell">
                {t.next_due_date ? format(parseISO(t.next_due_date), 'd MMM yyyy', { locale: es }) : '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-400" title="Ver detalle" onClick={() => onViewDetail(t.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {t.subscription_plan !== 'lifetime' && (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-white/[0.08] text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20" onClick={() => onRenew(t.id, 'month')}>
                        <CalendarPlus className="h-3 w-3" /> +1M
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-white/[0.08] text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 hidden sm:inline-flex" onClick={() => onRenew(t.id, 'year')}>
                        <Calendar className="h-3 w-3" /> +1A
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-300" onClick={() => onEditDue(t)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AlertsPanel({ alertTenants, onViewDetail, onRenew }: any) {
  if (alertTenants.length === 0) {
    return (
      <div className="admin-card p-12 flex flex-col items-center justify-center text-slate-500">
        <CheckCircle2 className="h-10 w-10 text-emerald-500/30 mb-3" />
        <p className="text-sm font-medium">Sin alertas pendientes</p>
        <p className="text-[12px] text-slate-500">Todas las membresías están al día</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alertTenants.map((t: any) => (
        <div
          key={t.id}
          className={cn(
            'admin-card p-4 flex items-center justify-between gap-3',
            t.daysLeft < 0 ? 'border-red-500/20' : t.daysLeft <= 3 ? 'border-amber-500/20' : 'border-yellow-500/15'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              t.daysLeft < 0 ? 'bg-red-500/10' : 'bg-amber-500/10'
            )}>
              <AlertTriangle className={cn('h-4 w-4', t.daysLeft < 0 ? 'text-red-400' : 'text-amber-400')} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-200 truncate">{t.name}</p>
              <p className="text-[11px] text-slate-500">
                Corte: {format(parseISO(t.next_due_date), 'd MMM yyyy', { locale: es })}
                {' · '}{formatCurrency(t.monthly_fee || 0)}/mes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px]',
                t.daysLeft < 0 ? 'border-red-500/20 text-red-400' : 'border-amber-500/20 text-amber-400'
              )}
            >
              {t.daysLeft < 0 ? `Vencida (${Math.abs(t.daysLeft)}d)` : `${t.daysLeft}d`}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => onRenew(t.id, 'month')}
            >
              Renovar
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-400" onClick={() => onViewDetail(t.id)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvoicesPanel({ invoices, tenants, onMarkPaid }: any) {
  const getTenantName = (id: string) => tenants.find((t: any) => t.id === id)?.name || 'Desconocido';

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-white/[0.02] hover:bg-white/[0.02]">
            <TableHead className="text-[10px] uppercase text-slate-500">Organización</TableHead>
            <TableHead className="text-[10px] uppercase text-slate-500">Monto</TableHead>
            <TableHead className="text-[10px] uppercase text-slate-500">Vencimiento</TableHead>
            <TableHead className="text-[10px] uppercase text-slate-500">Estado</TableHead>
            <TableHead className="text-[10px] uppercase text-slate-500">Pagado</TableHead>
            <TableHead className="text-[10px] uppercase text-slate-500 text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-500 text-[13px]">
              Sin facturas registradas
            </TableCell></TableRow>
          ) : invoices.map((inv: any) => (
            <TableRow key={inv.id} className="border-white/[0.04] hover:bg-white/[0.02]">
              <TableCell className="text-[12px] text-slate-200 font-medium">{getTenantName(inv.tenant_id)}</TableCell>
              <TableCell className="text-[12px] font-semibold text-slate-200 tabular-nums">{formatCurrency(inv.amount_due)}</TableCell>
              <TableCell className="text-[12px] text-slate-400 tabular-nums">
                {format(parseISO(inv.due_date), 'd MMM yyyy', { locale: es })}
              </TableCell>
              <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
              <TableCell className="text-[12px] text-slate-400">
                {inv.paid_at ? format(parseISO(inv.paid_at), 'd MMM yyyy', { locale: es }) : '—'}
              </TableCell>
              <TableCell className="text-right">
                {inv.status !== 'paid' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => onMarkPaid(inv.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Pagada
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
