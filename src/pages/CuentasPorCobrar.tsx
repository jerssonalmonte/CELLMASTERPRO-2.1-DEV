import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Search, Eye, Plus, DollarSign, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { AccountReceivable } from '@/types';

const db = supabase as any;

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  pendiente: { label: 'Pendiente', class: 'bg-status-waiting-bg text-status-waiting' },
  parcial: { label: 'Parcial', class: 'bg-status-process-bg text-status-process' },
  pagado: { label: 'Pagado', class: 'bg-status-ok-bg text-status-ok' },
};

export default function CuentasPorCobrar() {
  const { arList } = useStore();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selected, setSelected] = useState<AccountReceivable | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('efectivo');
  const [payNotes, setPayNotes] = useState('');

  // AR Payments for selected
  const [payments, setPayments] = useState<any[]>([]);

  const loadPayments = async (arId: string) => {
    const { data } = await db.from('ar_payments').select('*').eq('ar_id', arId).order('payment_date', { ascending: false });
    setPayments(data || []);
  };

  const filtered = useMemo(() => {
    return arList.filter(ar => {
      const q = search.toLowerCase();
      const matchSearch = !search || ar.customer_name.toLowerCase().includes(q) || ar.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'todos' || ar.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [arList, search, statusFilter]);

  const totalPending = arList.filter(a => a.status !== 'pagado').reduce((s, a) => s + a.balance_due, 0);

  const openDetail = async (ar: AccountReceivable) => {
    setSelected(ar);
    await loadPayments(ar.id);
  };

  const handlePayment = async () => {
    if (!selected || !payAmount) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Monto inválido'); return; }
    if (amount > selected.balance_due) { toast.error('El monto excede el saldo pendiente'); return; }

    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          action: 'ar_payment',
          ar_id: selected.id,
          amount,
          payment_method: payMethod,
          notes: payNotes || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Abono registrado');
      setShowPayment(false);
      setPayAmount('');
      setPayNotes('');
      qc.invalidateQueries({ queryKey: ['accounts_receivable', tenantId] });
      await loadPayments(selected.id);
      setSelected(prev => prev ? {
        ...prev,
        paid_amount: data.paid_amount,
        balance_due: data.balance_due,
        status: data.status,
      } : null);
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar abono');
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Cuentas por Cobrar</h1>
          <div className="text-sm text-muted-foreground">
            Pendiente total: <strong className="text-foreground">{formatCurrency(totalPending)}</strong>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por cliente o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(ar => {
                const sb = STATUS_BADGES[ar.status] || STATUS_BADGES.pendiente;
                return (
                  <TableRow key={ar.id} className="table-row-hover cursor-pointer" onClick={() => openDetail(ar)}>
                    <TableCell>
                      <p className="font-medium text-sm">{ar.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{ar.customer_phone}</p>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{ar.description}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(ar.original_amount)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(ar.paid_amount)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(ar.balance_due)}</TableCell>
                    <TableCell><span className={`status-badge ${sb.class}`}>{sb.label}</span></TableCell>
                    <TableCell><Eye className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay cuentas por cobrar</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-lg">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle>Cuenta por Cobrar</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Cliente:</span> <strong>{selected.customer_name}</strong></div>
                    <div><span className="text-muted-foreground">Tel:</span> {selected.customer_phone || '—'}</div>
                    <div className="col-span-2"><span className="text-muted-foreground">Descripción:</span> {selected.description}</div>
                    <div><span className="text-muted-foreground">Monto Original:</span> {formatCurrency(selected.original_amount)}</div>
                    <div><span className="text-muted-foreground">Pagado:</span> {formatCurrency(selected.paid_amount)}</div>
                    <div><span className="text-muted-foreground">Saldo:</span> <strong className="text-primary">{formatCurrency(selected.balance_due)}</strong></div>
                  </div>

                  {selected.status !== 'pagado' && (
                    <Button className="w-full" onClick={() => { setShowPayment(true); setPayAmount(''); setPayNotes(''); }}>
                      <DollarSign className="mr-2 h-4 w-4" /> Registrar Abono
                    </Button>
                  )}

                  {payments.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-2">Historial de Pagos</h4>
                      <div className="space-y-1">
                        {payments.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2 text-xs">
                            <div>
                              <span className="font-medium">{formatCurrency(Number(p.amount))}</span>
                              <span className="text-muted-foreground ml-2">{p.payment_method}</span>
                            </div>
                            <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString('es-DO')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Abono</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Monto (RD$)</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={selected ? `Máx: ${formatCurrency(selected.balance_due)}` : ''} />
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notas</Label><Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPayment(false)}>Cancelar</Button>
              <Button onClick={handlePayment}>Registrar Abono</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
