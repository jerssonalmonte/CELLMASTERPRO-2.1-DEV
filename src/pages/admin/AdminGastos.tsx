import { useState, useEffect, useMemo } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Receipt, Plus, TrendingDown, DollarSign, CalendarDays, Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const db = supabase as any;

const CATEGORIES = ['Infraestructura', 'Marketing', 'Operativa', 'Software', 'Salarios', 'Otro'];
const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b'];

const CATEGORY_COLORS: Record<string, string> = {
  Infraestructura: 'border-blue-500/20 text-blue-400',
  Marketing: 'border-emerald-500/20 text-emerald-400',
  Operativa: 'border-amber-500/20 text-amber-400',
  Software: 'border-cyan-500/20 text-cyan-400',
  Salarios: 'border-red-500/20 text-red-400',
  Otro: 'border-slate-500/20 text-slate-400',
};

export default function AdminGastos() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', category: 'Infraestructura', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });

  const fetchExpenses = async () => {
    const { data } = await db.from('saas_expenses').select('*').order('expense_date', { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExpenses(); }, []);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = parseISO(e.expense_date);
      return d >= monthStart && d <= monthEnd;
    }), [expenses, monthStart, monthEnd]);

  const lastMonthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = parseISO(e.expense_date);
      return d >= lastMonthStart && d <= lastMonthEnd;
    }), [expenses, lastMonthStart, lastMonthEnd]);

  const currentTotal = currentMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const lastTotal = lastMonthExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Category breakdown for current month
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses]);

  const topCategory = categoryData.length > 0 ? categoryData[0].name : '—';

  const handleSave = async () => {
    if (!form.title || !form.amount) { toast.error('Título y monto son requeridos'); return; }
    setSaving(true);
    const { error } = await db.from('saas_expenses').insert({
      title: form.title,
      category: form.category,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error('Error al guardar gasto'); return; }
    toast.success('Gasto registrado');
    setDialogOpen(false);
    setForm({ title: '', category: 'Infraestructura', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    const { error } = await db.from('saas_expenses').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Gasto eliminado');
    fetchExpenses();
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50">Gastos Operativos (Opex)</h1>
            <p className="text-sm text-slate-500 mt-0.5">Control de costos del SaaS</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Registrar Gasto
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <DollarSign className="h-4 w-4 text-red-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Gastos Mes Actual</p>
            <p className="text-xl font-bold text-slate-50 mt-1 tabular-nums">{formatCurrency(currentTotal)}</p>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <CalendarDays className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Gastos Mes Anterior</p>
            <p className="text-xl font-bold text-slate-50 mt-1 tabular-nums">{formatCurrency(lastTotal)}</p>
          </div>
          <div className="admin-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <TrendingDown className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Mayor Categoría</p>
            <p className="text-xl font-bold text-slate-50 mt-1">{topCategory}</p>
          </div>
        </div>

        {/* Chart + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie Chart */}
          <div className="admin-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">Distribución por Categoría</h3>
            </div>
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Receipt className="h-10 w-10 text-slate-700 mb-2" />
                <p className="text-[13px]">Sin gastos este mes</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} strokeWidth={0}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[CATEGORIES.indexOf(categoryData[i].name) % PIE_COLORS.length] || PIE_COLORS[5]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(220,20%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                      formatter={(value: number) => [formatCurrency(value), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-[12px]">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[CATEGORIES.indexOf(c.name) % PIE_COLORS.length] || PIE_COLORS[5] }} />
                      <span className="text-slate-400">{c.name}</span>
                      <span className="ml-auto font-semibold text-slate-200 tabular-nums">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Expense Table */}
          <div className="lg:col-span-2 admin-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">Gastos Recientes</h3>
            </div>
            <div className="overflow-auto max-h-[420px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06]">
                    <TableHead className="text-slate-400 text-[11px]">Fecha</TableHead>
                    <TableHead className="text-slate-400 text-[11px]">Título</TableHead>
                    <TableHead className="text-slate-400 text-[11px]">Categoría</TableHead>
                    <TableHead className="text-slate-400 text-[11px] text-right">Monto</TableHead>
                    <TableHead className="text-slate-400 text-[11px] w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 50).map(exp => (
                    <TableRow key={exp.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell className="text-slate-300 text-[13px] tabular-nums">
                        {format(parseISO(exp.expense_date), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <p className="text-[13px] font-medium text-slate-200">{exp.title}</p>
                        {exp.notes && <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{exp.notes}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.Otro}`}>
                          {exp.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-semibold text-red-400 tabular-nums">
                        {formatCurrency(Number(exp.amount))}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => handleDelete(exp.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-12">
                        No hay gastos registrados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* New Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[hsl(220,20%,8%)] border-white/[0.08] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-50">Registrar Gasto</DialogTitle>
            <DialogDescription className="text-slate-500">Añade un nuevo gasto operativo al registro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-[13px]">Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Supabase Pro Plan"
                className="bg-white/[0.04] border-white/[0.08] text-slate-100 placeholder:text-slate-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-[13px]">Categoría</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(220,20%,10%)] border-white/[0.08]">
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-slate-200 focus:bg-white/[0.06]">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-[13px]">Monto (RD$)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-[13px]">Fecha</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-[13px]">Notas (opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Detalles adicionales..."
                className="bg-white/[0.04] border-white/[0.08] text-slate-100 placeholder:text-slate-600 resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-slate-200">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
