import { useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useStore } from '@/hooks/useStore';
import { useLowStockThreshold } from '@/hooks/useLowStockThreshold';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package, Wrench, ShoppingCart, AlertTriangle, TrendingUp, CreditCard, Crown, Users, DollarSign,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { format, subMonths, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const { profile } = useAuth();
  const { canViewFinancials } = useRole();
  const { inventory, sales, repairs, loans, customers } = useStore();
  const { threshold: lowStockThreshold } = useLowStockThreshold();

  const thisMonth = format(new Date(), 'yyyy-MM');
  const today = format(new Date(), 'yyyy-MM-dd');

  const salesMonth = useMemo(() => sales.filter(s => s.sold_at?.startsWith(thisMonth)).reduce((s, sale) => s + sale.total_amount, 0), [sales, thisMonth]);
  const salesToday = useMemo(() => sales.filter(s => s.sold_at?.startsWith(today)).reduce((s, sale) => s + sale.total_amount, 0), [sales, today]);
  const salesTodayCount = useMemo(() => sales.filter(s => s.sold_at?.startsWith(today)).length, [sales, today]);
  const availableCount = inventory.filter(i => i.status === 'disponible').length;
  const activeRepairs = repairs.filter(r => !['entregado', 'no_se_pudo'].includes(r.status)).length;
  const overdueLoans = loans.filter(l => l.status === 'atrasado').length;
  const activeLoans = loans.filter(l => !['liquidado', 'cancelado'].includes(l.status)).length;
  const loanPending = loans.filter(l => !['liquidado', 'cancelado'].includes(l.status)).reduce((s, l) => s + l.balance_due, 0);

  const lowStockCount = useMemo(() => {
    const map = new Map<string, number>();
    inventory.filter(i => i.status === 'disponible').forEach(i => {
      const p = i.product;
      if (!p) return;
      const key = `${p.brand}-${p.name}-${p.color}-${p.capacity || ''}`;
      map.set(key, (map.get(key) || 0) + (i.quantity || 1));
    });
    return [...map.values()].filter(qty => qty > 0 && qty <= lowStockThreshold).length;
  }, [inventory, lowStockThreshold]);

  // Rankings
  const topSellingProducts = useMemo(() => {
    const counts: Record<string, { name: string; count: number; revenue: number }> = {};
    sales.filter(s => s.sold_at?.startsWith(thisMonth)).forEach(sale => {
      (sale.sale_items || []).forEach(si => {
        const key = `${si.brand} ${si.model}`;
        if (!counts[key]) counts[key] = { name: key, count: 0, revenue: 0 };
        counts[key].count += si.quantity;
        counts[key].revenue += si.subtotal;
      });
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales, thisMonth]);

  const topCustomers = useMemo(() => {
    const counts: Record<string, { name: string; purchases: number; total: number }> = {};
    sales.filter(s => s.sold_at?.startsWith(thisMonth)).forEach(sale => {
      const name = sale.customer_name;
      if (name === 'Cliente General') return;
      if (!counts[name]) counts[name] = { name, purchases: 0, total: 0 };
      counts[name].purchases++;
      counts[name].total += sale.total_amount;
    });
    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [sales, thisMonth]);

  const topBrands = useMemo(() => {
    const counts: Record<string, { brand: string; sold: number; revenue: number }> = {};
    sales.forEach(sale => {
      (sale.sale_items || []).forEach(si => {
        if (!counts[si.brand]) counts[si.brand] = { brand: si.brand, sold: 0, revenue: 0 };
        counts[si.brand].sold += si.quantity;
        counts[si.brand].revenue += si.subtotal;
      });
    });
    return Object.values(counts).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [sales]);

  const kpis = [
    { label: 'Ventas Hoy', value: `${salesTodayCount} · ${formatCurrency(salesToday)}`, icon: ShoppingCart, color: 'text-status-ok', bgColor: 'bg-status-ok-bg' },
    { label: 'Equipos en Stock', value: String(availableCount), icon: Package, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Reparaciones Activas', value: String(activeRepairs), icon: Wrench, color: 'text-status-process', bgColor: 'bg-status-process-bg' },
    ...(canViewFinancials ? [
      { label: 'Ventas del Mes', value: formatCurrency(salesMonth), icon: TrendingUp, color: 'text-primary', bgColor: 'bg-primary/10' },
    ] : []),
    { label: 'Stock Bajo', value: String(lowStockCount), icon: AlertTriangle, color: lowStockCount > 0 ? 'text-status-waiting' : 'text-status-ok', bgColor: lowStockCount > 0 ? 'bg-status-waiting-bg' : 'bg-status-ok-bg' },
    ...(canViewFinancials ? [
      { label: 'Créditos Activos', value: `${activeLoans} · ${formatCurrency(loanPending)}`, icon: CreditCard, color: overdueLoans > 0 ? 'text-destructive' : 'text-primary', bgColor: overdueLoans > 0 ? 'bg-destructive/10' : 'bg-primary/10' },
    ] : []),
    { label: 'Clientes', value: String(customers.length), icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
  ];

  const salesByMonth = useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    return eachMonthOfInterval({ start, end }).map(month => {
      const m = format(month, 'yyyy-MM');
      return { month: format(month, 'MMM', { locale: es }), ventas: sales.filter(s => s.sold_at?.startsWith(m)).reduce((s, sale) => s + sale.total_amount, 0) };
    });
  }, [sales]);

  const repairData = useMemo(() => {
    const counts: Record<string, number> = {};
    repairs.filter(r => !['entregado', 'no_se_pudo'].includes(r.status)).forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const labels: Record<string, string> = { recibido: 'Recibido', diagnosticando: 'Diagnosticando', espera_pieza: 'Espera Pieza', en_proceso: 'En Proceso', en_prueba: 'En Prueba', listo: 'Listo' };
    const colors = ['hsl(215,20%,55%)', 'hsl(212,100%,56%)', 'hsl(38,95%,55%)', 'hsl(280,60%,55%)', 'hsl(190,70%,50%)', 'hsl(142,72%,50%)'];
    return Object.entries(counts).map(([key, value], i) => ({ name: labels[key] || key, value, color: colors[i % colors.length] }));
  }, [repairs]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const userName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'Usuario';

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {greeting}, <span className="font-semibold text-foreground">{userName}</span> 👋
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {kpis.map((kpi, index) => (
            <div key={kpi.label} className="kpi-card animate-fade-in group" style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{kpi.label}</p>
                  <p className="mt-1 text-sm sm:text-base font-bold tracking-tight break-all leading-tight">{kpi.value}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${kpi.bgColor} transition-transform duration-300 group-hover:scale-110`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts + Rankings */}
        {canViewFinancials && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sales chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Ventas Mensuales</CardTitle>
              </CardHeader>
              <CardContent className="-ml-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,18%)" />
                    <XAxis dataKey="month" stroke="hsl(215,15%,50%)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(215,15%,50%)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={35} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(222,20%,11%)', border: '1px solid hsl(222,15%,18%)', borderRadius: '10px', color: 'hsl(210,20%,95%)', fontSize: '12px' }} formatter={(v: number) => [formatCurrency(v), 'Ventas']} cursor={{ fill: 'hsl(212,100%,56%,0.05)' }} />
                    <Bar dataKey="ventas" fill="hsl(212,100%,56%)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Repair pie */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Wrench className="h-4 w-4 text-status-process" /> Estado del Taller</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={repairData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={4} strokeWidth={0}>
                      {repairData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(222,20%,11%)', border: '1px solid hsl(222,15%,18%)', borderRadius: '10px', color: 'hsl(210,20%,95%)', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                  {repairData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} /> {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top products ranking */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Crown className="h-4 w-4 text-yellow-500" /> Top Productos del Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topSellingProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos este mes</p>
                ) : topSellingProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-muted text-muted-foreground' : i === 2 ? 'bg-orange-500/20 text-orange-500' : 'bg-muted/50 text-muted-foreground'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.count} vendidos</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(p.revenue)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top customers ranking */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Top Clientes del Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos este mes</p>
                ) : topCustomers.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted/50 text-muted-foreground'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.purchases} compras</p>
                    </div>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top brands */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Marcas Más Vendidas (General)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {topBrands.map((b, i) => (
                    <div key={b.brand} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <Badge variant={i === 0 ? 'default' : 'outline'} className="text-[10px]">#{i + 1}</Badge>
                      <span className="text-sm font-medium">{b.brand}</span>
                      <span className="text-xs text-muted-foreground">({b.sold} uds)</span>
                      <span className="text-sm font-semibold text-primary">{formatCurrency(b.revenue)}</span>
                    </div>
                  ))}
                  {topBrands.length === 0 && <p className="text-sm text-muted-foreground">Sin datos</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
