import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, DollarSign, AlertTriangle,
  TrendingUp, Activity, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, XCircle, CalendarDays, Wrench, Handshake, HelpCircle, MoreHorizontal,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO, subMonths, addDays, isAfter, isBefore, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';

const db = supabase as any;

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const ms = startOfMonth(now).toISOString().split('T')[0];
    const me = endOfMonth(now).toISOString().split('T')[0];
    Promise.all([
      db.from('tenants').select('*').order('created_at', { ascending: false }),
      db.from('profiles').select('*'),
      db.from('user_roles').select('*'),
      db.from('saas_appointments').select('*').eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(20),
      db.from('saas_invoices').select('*').eq('status', 'paid').gte('paid_at', ms).lte('paid_at', me + 'T23:59:59'),
      db.from('saas_expenses').select('*').gte('expense_date', ms).lte('expense_date', me),
    ]).then(([t, p, r, a, inv, exp]: any[]) => {
      setTenants(t.data || []);
      setProfiles(p.data || []);
      setRoles(r.data || []);
      setAppointments(a.data || []);
      setInvoices(inv.data || []);
      setExpenses(exp.data || []);
      setLoading(false);
    });
  }, []);

  const activeTenants = tenants.filter(t => t.subscription_status === 'activa');
  const suspendedTenants = tenants.filter(t => t.subscription_status === 'suspendida');
  const pendingTenants = tenants.filter(t => t.subscription_status === 'pendiente');
  const monthlyRevenue = activeTenants.reduce((sum, t) => sum + (t.monthly_fee || 0), 0);

  // Net Profit = Paid invoices this month - Expenses this month
  const monthInvoiceRevenue = invoices.reduce((s: number, i: any) => s + Number(i.amount_due || 0), 0);
  const monthExpenseTotal = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const netProfit = monthInvoiceRevenue - monthExpenseTotal;

  const today = new Date();
  const in7days = addDays(today, 7);
  const expiringTenants = tenants.filter(t => {
    if (!t.next_due_date || t.subscription_plan === 'lifetime') return false;
    const due = parseISO(t.next_due_date);
    return isAfter(due, today) && isBefore(due, in7days);
  });

  // Upcoming appointments (next 3 days)
  const in3days = addDays(today, 3);
  const upcomingAppts = appointments.filter(a => {
    const d = parseISO(a.scheduled_at);
    return isBefore(d, in3days);
  }).slice(0, 5);

  const todayAppts = appointments.filter(a => {
    const d = parseISO(a.scheduled_at);
    return d.toDateString() === today.toDateString();
  });

  const APPT_ICONS: Record<string, any> = {
    installation: Wrench, sales_meeting: Handshake, support: HelpCircle, other: MoreHorizontal,
  };
  const APPT_COLORS: Record<string, string> = {
    installation: 'text-blue-400 bg-blue-500/10',
    sales_meeting: 'text-emerald-400 bg-emerald-500/10',
    support: 'text-amber-400 bg-amber-500/10',
    other: 'text-slate-400 bg-slate-500/10',
  };

  // Revenue projection data (6 months)
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = subMonths(today, 5 - i);
    const label = format(monthStart, 'MMM yy', { locale: es });
    const activeAtMonth = tenants.filter(t => {
      const created = parseISO(t.created_at);
      return isBefore(created, monthStart) && t.subscription_status !== 'suspendida';
    });
    const actual = activeAtMonth.reduce((sum, t) => sum + (t.monthly_fee || 0), 0);
    const projected = actual * 1.08; // 8% growth projection
    return { month: label, actual, projected };
  });

  // Growth data
  const growthData = Array.from({ length: 6 }, (_, i) => {
    const monthStart = subMonths(today, 5 - i);
    const label = format(monthStart, 'MMM', { locale: es });
    const count = tenants.filter(t => {
      const d = parseISO(t.created_at);
      return d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear();
    }).length;
    return { month: label, count };
  });

  // Role distribution
  const roleCounts = Object.entries(
    roles.reduce((acc: Record<string, number>, r: any) => {
      acc[r.role] = (acc[r.role] || 0) + 1;
      return acc;
    }, {})
  ).map(([role, count]) => ({
    name: { super_admin: 'Super Admin', admin: 'Admin', manager: 'Gerente', staff: 'Vendedor', technician: 'Técnico' }[role] || role,
    value: count as number,
  }));

  // Recent activity: last 8 tenants with context
  const recentActivity = tenants.slice(0, 8).map(t => {
    const daysAgo = differenceInDays(today, parseISO(t.created_at));
    return { ...t, daysAgo };
  });

  // Previous month revenue for comparison
  const lastMonthTenants = tenants.filter(t => {
    const created = parseISO(t.created_at);
    const lastMonth = subMonths(today, 1);
    return isBefore(created, lastMonth) && t.subscription_status === 'activa';
  });
  const lastMonthRevenue = lastMonthTenants.reduce((sum, t) => sum + (t.monthly_fee || 0), 0);
  const revenueChange = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50">
              Centro de Comando
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(today, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistema operativo
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            icon={DollarSign}
            label="MRR (Ingresos Recurrentes)"
            value={formatCurrency(monthlyRevenue)}
            change={revenueChange}
            color="emerald"
          />
          <KpiCard
            icon={Building2}
            label="Organizaciones"
            value={tenants.length}
            subtitle={`${activeTenants.length} activas · ${suspendedTenants.length} suspendidas`}
            color="blue"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Vencen en 7 días"
            value={expiringTenants.length}
            subtitle={expiringTenants.length > 0 ? 'Requieren atención' : 'Todo al día'}
            color={expiringTenants.length > 0 ? 'amber' : 'emerald'}
          />
          <KpiCard
            icon={CalendarDays}
            label="Citas Hoy"
            value={todayAppts.length}
            subtitle={upcomingAppts.length > todayAppts.length ? `${upcomingAppts.length - todayAppts.length} más en 3 días` : 'Sin próximas'}
            color="blue"
          />
          <KpiCard
            icon={TrendingUp}
            label="Beneficio Neto (Mes)"
            value={formatCurrency(Math.abs(netProfit))}
            subtitle={netProfit >= 0 ? `+${formatCurrency(monthInvoiceRevenue)} ingresos` : `${formatCurrency(monthExpenseTotal)} en gastos`}
            color={netProfit >= 0 ? 'emerald' : 'red'}
            prefix={netProfit < 0 ? '-' : ''}
          />
        </div>

        {/* Revenue Chart + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Projected vs Actual */}
          <div className="lg:col-span-2 admin-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100">Ingresos Proyectados vs Actuales</h3>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-full bg-emerald-500/80" /> Actual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-6 rounded-full bg-blue-500/40" /> Proyectado
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(220,20%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="projected" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#gradProjected)" name="Proyectado" />
                <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fill="url(#gradActual)" name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Feed */}
          <div className="admin-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">Actividad Reciente</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[280px]">
              {recentActivity.map(t => (
                <div key={t.id} className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-white/[0.03] transition-colors">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    t.subscription_status === 'activa' ? 'bg-emerald-500/10' :
                    t.subscription_status === 'suspendida' ? 'bg-red-500/10' : 'bg-blue-500/10'
                  }`}>
                    {t.subscription_status === 'activa' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                     t.subscription_status === 'suspendida' ? <XCircle className="h-3.5 w-3.5 text-red-400" /> :
                     <Clock className="h-3.5 w-3.5 text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-200 truncate">{t.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {t.daysAgo === 0 ? 'Hoy' : t.daysAgo === 1 ? 'Ayer' : `Hace ${t.daysAgo} días`}
                      {' · '}{formatCurrency(t.monthly_fee || 0)}/mes
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    t.subscription_status === 'activa' ? 'border-emerald-500/20 text-emerald-400' :
                    t.subscription_status === 'suspendida' ? 'border-red-500/20 text-red-400' :
                    'border-blue-500/20 text-blue-400'
                  }`}>
                    {t.subscription_status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: Growth + Roles + Expiring + Agenda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Growth chart */}
          <div className="admin-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">Crecimiento (6 meses)</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={growthData}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(220,20%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Organizaciones" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Role distribution */}
          <div className="admin-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-100">Distribución por Rol</h3>
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="45%" height={180}>
                <PieChart>
                  <Pie data={roleCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68} innerRadius={36} strokeWidth={0}>
                    {roleCounts.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(220,20%,10%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {roleCounts.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2 text-[12px]">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-400">{r.name}</span>
                    <span className="ml-auto font-semibold text-slate-200 tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expiring soon */}
          <div className="admin-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100">Próximas a Vencer</h3>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {expiringTenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mb-2" />
                  <p className="text-[13px]">Todo al día</p>
                </div>
              ) : (
                expiringTenants.map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-amber-500/[0.04] border border-amber-500/10 px-3 py-2.5">
                    <span className="text-[13px] font-medium text-slate-200">{t.name}</span>
                    <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-[10px]">
                      {format(parseISO(t.next_due_date), 'd MMM', { locale: es })}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Appointments (3 days) */}
          <div className="admin-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-100">Agenda (3 días)</h3>
              </div>
              <button onClick={() => navigate('/admin/agenda')} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
                Ver todo →
              </button>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {upcomingAppts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <CalendarDays className="h-8 w-8 text-blue-500/20 mb-2" />
                  <p className="text-[13px]">Sin citas próximas</p>
                </div>
              ) : (
                upcomingAppts.map(appt => {
                  const ApptIcon = APPT_ICONS[appt.type] || MoreHorizontal;
                  const apptColor = APPT_COLORS[appt.type] || APPT_COLORS.other;
                  const d = parseISO(appt.scheduled_at);
                  return (
                    <div key={appt.id} className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] px-2.5 py-2 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => navigate('/admin/agenda')}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${apptColor}`}>
                        <ApptIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-200 truncate">{appt.title}</p>
                        <p className="text-[10px] text-slate-500">
                          {format(d, "EEE d · HH:mm", { locale: es })}
                          {appt.location && ` · ${appt.location}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

/* ─── KPI Card Component ─── */
function KpiCard({ icon: Icon, label, value, change, subtitle, color, prefix }: {
  icon: any; label: string; value: string | number;
  change?: number; subtitle?: string; color: string; prefix?: string;
}) {
  const iconColors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
  };

  return (
    <div className="admin-card p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColors[color]} transition-transform group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium leading-tight">{label}</p>
      <p className="text-xl font-bold text-slate-50 mt-1 tabular-nums break-all">{prefix}{value}</p>
      {subtitle && <p className="text-[11px] text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}
