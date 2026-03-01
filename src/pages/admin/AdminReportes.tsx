import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { DollarSign, Building2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const db = supabase as any;

export default function AdminReportes() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.from('tenants').select('*').order('created_at', { ascending: false }).then(({ data }: any) => {
      setTenants(data || []);
      setLoading(false);
    });
  }, []);

  const activeTenants = tenants.filter(t => t.subscription_status === 'activa');
  const totalRevenue = activeTenants.reduce((sum, t) => sum + (t.monthly_fee || 0), 0);
  const today = new Date();

  const growthData = Array.from({ length: 12 }, (_, i) => {
    const monthStart = subMonths(today, 11 - i);
    const label = format(monthStart, 'MMM yy', { locale: es });
    const count = tenants.filter(t => {
      const d = parseISO(t.created_at);
      return d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear();
    }).length;
    return { month: label, nuevas: count };
  });

  const topOrgs = [...activeTenants]
    .filter(t => t.subscription_plan !== 'lifetime')
    .sort((a, b) => (b.monthly_fee || 0) - (a.monthly_fee || 0))
    .slice(0, 10)
    .map(t => ({ name: t.name.length > 15 ? t.name.slice(0, 15) + '…' : t.name, cuota: t.monthly_fee || 0 }));

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-50">Reportes</h1>
          <p className="text-sm text-slate-400 mt-0.5">Estadísticas globales e ingresos de la plataforma</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard icon={DollarSign} label="Ingresos Mensuales" value={formatCurrency(totalRevenue)} accent="emerald" />
          <KpiCard icon={Building2} label="Suscriptores Activos" value={activeTenants.length} accent="amber" />
          <KpiCard icon={TrendingUp} label="Total Organizaciones" value={tenants.length} accent="blue" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-5">
            <h3 className="text-sm font-semibold text-amber-50 mb-4">Crecimiento (12 meses)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growthData}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(228,22%,12%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Line type="monotone" dataKey="nuevas" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Nuevas Orgs" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-5">
            <h3 className="text-sm font-semibold text-amber-50 mb-4">Top 10 por Cuota Mensual</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topOrgs} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ background: 'hsl(228,22%,12%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }} />
                <Bar dataKey="cuota" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Cuota" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[accent]} mb-3`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-lg font-bold text-amber-50 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
