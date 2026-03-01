import { useState, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import {
  Package, ShoppingCart, Wrench, CreditCard, TrendingUp, TrendingDown, Users, DollarSign, CalendarDays, Wallet, ArrowUpRight, ArrowDownRight, FileDown, BarChart3, PieChart as PieChartIcon, Activity,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/* ─── KPI Card ─────────────────────────────────── */
const KPI = ({ icon: Icon, label, value, sub, accent, trend }: {
  icon: any; label: string; value: string; sub?: string; accent?: 'green' | 'red' | 'blue' | 'default'; trend?: 'up' | 'down';
}) => {
  const accentClasses = {
    green: 'text-status-ok',
    red: 'text-destructive',
    blue: 'text-primary',
    default: 'text-foreground',
  };
  const iconBg = {
    green: 'bg-status-ok/10',
    red: 'bg-destructive/10',
    blue: 'bg-primary/10',
    default: 'bg-muted',
  };
  const a = accent || 'default';

  return (
    <Card className="border-border/60 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold tracking-tight ${accentClasses[a]}`}>{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg[a]}`}>
            {trend === 'up' ? <ArrowUpRight className="h-4.5 w-4.5 text-status-ok" />
              : trend === 'down' ? <ArrowDownRight className="h-4.5 w-4.5 text-destructive" />
              : <Icon className={`h-4.5 w-4.5 ${accentClasses[a] === 'text-foreground' ? 'text-muted-foreground' : accentClasses[a]}`} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Tooltip style ───────────────────────────── */
const tooltipStyle = {
  backgroundColor: 'hsl(222,20%,11%)',
  border: '1px solid hsl(222,15%,22%)',
  borderRadius: '10px',
  color: 'hsl(210,20%,95%)',
  fontSize: '12px',
  boxShadow: '0 8px 30px -4px hsl(0 0% 0% / 0.5)',
};

/* ─── Section Header ──────────────────────────── */
const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-3 mt-2">
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-3.5 w-3.5 text-primary" />
    </div>
    <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
    <div className="flex-1 h-px bg-border/50 ml-2" />
  </div>
);

export default function Informe() {
  const { sales, inventory, repairs, loans, customers, purchases, arList } = useStore();
  const { tenant } = useAuth();
  const [period, setPeriod] = useState('this_month');
  const [exporting, setExporting] = useState(false);

  const getRange = () => {
    const now = new Date();
    switch (period) {
      case 'today': return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now, label: 'Hoy' };
      case '7days': return { start: subDays(now, 7), end: now, label: 'Últimos 7 días' };
      case '30days': return { start: subDays(now, 30), end: now, label: 'Últimos 30 días' };
      case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy', { locale: es }) };
      case 'last_month': { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm), label: format(lm, 'MMMM yyyy', { locale: es }) }; }
      case '3months': return { start: subMonths(now, 3), end: now, label: 'Últimos 3 meses' };
      case '6months': return { start: subMonths(now, 6), end: now, label: 'Últimos 6 meses' };
      default: return { start: subMonths(now, 12), end: now, label: 'Último año' };
    }
  };

  const range = getRange();

  const inRange = (dateStr: string) => {
    try { return isWithinInterval(parseISO(dateStr), { start: range.start, end: range.end }); } catch { return false; }
  };

  const stats = useMemo(() => {
    const periodSales = sales.filter(s => inRange(s.sold_at));
    const periodPurchases = purchases.filter(p => inRange(p.purchased_at));
    const periodRepairs = repairs.filter(r => inRange(r.received_at));
    const deliveredRepairs = repairs.filter(r => r.status === 'entregado' && r.delivered_at && inRange(r.delivered_at));

    const salesRevenue = periodSales.reduce((s, sale) => s + sale.total_amount, 0);
    const purchasesCost = periodPurchases.reduce((s, p) => s + p.total_amount, 0);
    const repairRevenue = deliveredRepairs.reduce((s, r) => s + r.total_price, 0);
    const repairPartsCost = deliveredRepairs.reduce((s, r) => s + r.parts_cost, 0);

    const cogs = periodSales.reduce((s, sale) => {
      return s + (sale.sale_items || []).reduce((is, si) => {
        const inv = inventory.find(i => i.id === si.inventory_item_id);
        return is + ((inv?.purchase_cost || 0) * si.quantity);
      }, 0);
    }, 0);

    const grossProfit = salesRevenue - cogs;
    const totalIncome = salesRevenue + repairRevenue;
    const totalExpenses = purchasesCost + repairPartsCost;
    const netProfit = totalIncome - totalExpenses;

    const loanInterest = loans.reduce((s, l) => {
      return s + (l.loan_installments || []).filter(i => i.is_paid && i.paid_at && inRange(i.paid_at)).reduce((is, i) => is + i.interest_amount, 0);
    }, 0);

    const byMethod: Record<string, number> = {};
    periodSales.forEach(s => {
      const method = s.payment_method === 'cash' ? 'Contado' : s.payment_method === 'financing' ? 'Financiado' : 'Crédito';
      byMethod[method] = (byMethod[method] || 0) + s.total_amount;
    });

    const availableInv = inventory.filter(i => i.status === 'disponible');

    return {
      salesCount: periodSales.length,
      salesRevenue,
      cogs,
      grossProfit,
      grossMargin: salesRevenue > 0 ? (grossProfit / salesRevenue * 100) : 0,
      avgTicket: periodSales.length > 0 ? salesRevenue / periodSales.length : 0,
      purchasesCost,
      purchasesCount: periodPurchases.length,
      repairRevenue,
      repairCount: periodRepairs.length,
      deliveredCount: deliveredRepairs.length,
      repairPartsCost,
      totalIncome,
      totalExpenses,
      netProfit,
      loanInterest,
      byMethod: Object.entries(byMethod).map(([name, value]) => ({ name, value })),
      inventoryCount: availableInv.length,
      inventoryValue: availableInv.reduce((s, i) => s + i.sale_price, 0),
      inventoryCost: availableInv.reduce((s, i) => s + i.purchase_cost, 0),
      activeLoans: loans.filter(l => !['liquidado', 'cancelado'].includes(l.status)).length,
      loanPending: loans.filter(l => !['liquidado', 'cancelado'].includes(l.status)).reduce((s, l) => s + l.balance_due, 0),
      arPending: arList.filter(a => a.status !== 'pagado').reduce((s, a) => s + a.balance_due, 0),
      customerCount: customers.length,
    };
  }, [sales, inventory, repairs, loans, customers, purchases, arList, range.start, range.end]);

  const dailyTrend = useMemo(() => {
    const days = eachDayOfInterval({ start: range.start, end: range.end }).slice(-30);
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySales = sales.filter(s => s.sold_at?.startsWith(dayStr));
      return {
        date: format(day, 'dd/MM'),
        ventas: daySales.reduce((s, sale) => s + sale.total_amount, 0),
        count: daySales.length,
      };
    });
  }, [sales, range.start, range.end]);

  const monthlyTrend = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 11), end: new Date() });
    return months.map(month => {
      const m = format(month, 'yyyy-MM');
      const mSales = sales.filter(s => s.sold_at?.startsWith(m));
      const mPurchases = purchases.filter(p => p.purchased_at?.startsWith(m));
      const salesTotal = mSales.reduce((s, sale) => s + sale.total_amount, 0);
      const purchasesTotal = mPurchases.reduce((s, p) => s + p.total_amount, 0);
      return {
        month: format(month, 'MMM', { locale: es }),
        ventas: salesTotal,
        gastos: purchasesTotal,
        neto: salesTotal - purchasesTotal,
      };
    });
  }, [sales, purchases]);

  const methodColors = ['hsl(212,100%,56%)', 'hsl(142,72%,50%)', 'hsl(38,95%,55%)', 'hsl(280,60%,55%)'];

  /* ─── PDF Export (native jsPDF, no screenshot) ── */
  const handleExportPDF = useCallback(() => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const orgName = tenant?.name || 'Organización';
      const dateStr = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });
      let y = 15;

      // Header bar
      pdf.setFillColor(15, 17, 26);
      pdf.rect(0, 0, w, 38, 'F');
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 37, w, 1.2, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.text(orgName, 14, y + 3);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(160, 170, 190);
      pdf.text('Informe Financiero', 14, y + 11);
      pdf.text(`Período: ${range.label}  ·  Generado: ${dateStr}`, 14, y + 17);

      y = 48;

      // Helper functions
      const drawSectionTitle = (title: string, yPos: number) => {
        pdf.setFillColor(37, 99, 235);
        pdf.roundedRect(14, yPos - 1, 3, 6, 1, 1, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(40, 40, 50);
        pdf.text(title, 20, yPos + 4);
        pdf.setDrawColor(230, 230, 235);
        pdf.line(14, yPos + 8, w - 14, yPos + 8);
        return yPos + 13;
      };

      const drawKpiRow = (items: { label: string; value: string; }[], yPos: number) => {
        const colW = (w - 28) / items.length;
        items.forEach((item, i) => {
          const x = 14 + i * colW;
          pdf.setFillColor(248, 249, 252);
          pdf.roundedRect(x, yPos, colW - 3, 18, 2, 2, 'F');
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(120, 130, 150);
          pdf.text(item.label.toUpperCase(), x + 4, yPos + 6);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.setTextColor(30, 30, 40);
          pdf.text(item.value, x + 4, yPos + 14);
        });
        return yPos + 23;
      };

      const checkPage = (needed: number) => {
        const pageH = pdf.internal.pageSize.getHeight();
        if (y + needed > pageH - 15) {
          pdf.addPage();
          y = 15;
        }
      };

      // Section 1: Resumen General
      y = drawSectionTitle('Resumen General', y);
      y = drawKpiRow([
        { label: 'Ingresos Totales', value: formatCurrency(stats.totalIncome) },
        { label: 'Gastos Totales', value: formatCurrency(stats.totalExpenses) },
        { label: 'Ganancia Neta', value: formatCurrency(stats.netProfit) },
        { label: 'Margen Bruto', value: `${stats.grossMargin.toFixed(1)}%` },
      ], y);

      // Section 2: Ventas
      y = drawSectionTitle('Detalle de Ventas', y);
      y = drawKpiRow([
        { label: 'Total Ventas', value: formatCurrency(stats.salesRevenue) },
        { label: 'Costo de Ventas', value: formatCurrency(stats.cogs) },
        { label: 'Ganancia Bruta', value: formatCurrency(stats.grossProfit) },
        { label: 'Ticket Promedio', value: formatCurrency(stats.avgTicket) },
      ], y);

      // Sales count
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 110, 130);
      pdf.text(`${stats.salesCount} transacciones realizadas en el período`, 14, y);
      y += 8;

      // Section 3: Taller
      checkPage(40);
      y = drawSectionTitle('Taller de Reparaciones', y);
      y = drawKpiRow([
        { label: 'Ingresos Taller', value: formatCurrency(stats.repairRevenue) },
        { label: 'Reparaciones Recibidas', value: String(stats.repairCount) },
        { label: 'Entregadas', value: String(stats.deliveredCount) },
        { label: 'Costo Piezas', value: formatCurrency(stats.repairPartsCost) },
      ], y);

      // Section 4: Créditos
      checkPage(40);
      y = drawSectionTitle('Créditos y Financiamientos', y);
      y = drawKpiRow([
        { label: 'Intereses Cobrados', value: formatCurrency(stats.loanInterest) },
        { label: 'Cartera de Crédito', value: formatCurrency(stats.loanPending) },
        { label: 'Préstamos Activos', value: String(stats.activeLoans) },
        { label: 'Cuentas por Cobrar', value: formatCurrency(stats.arPending) },
      ], y);

      // Section 5: Inventario
      checkPage(40);
      y = drawSectionTitle('Estado del Inventario', y);
      y = drawKpiRow([
        { label: 'Unidades Disponibles', value: String(stats.inventoryCount) },
        { label: 'Valor en Venta', value: formatCurrency(stats.inventoryValue) },
        { label: 'Costo Total', value: formatCurrency(stats.inventoryCost) },
        { label: 'Margen Potencial', value: formatCurrency(stats.inventoryValue - stats.inventoryCost) },
      ], y);

      // Section 6: Métodos de pago
      if (stats.byMethod.length > 0) {
        checkPage(35);
        y = drawSectionTitle('Ventas por Método de Pago', y);
        stats.byMethod.forEach((m) => {
          const pct = stats.salesRevenue > 0 ? ((m.value / stats.salesRevenue) * 100).toFixed(1) : '0';
          // Bar
          const barW = stats.salesRevenue > 0 ? ((m.value / stats.salesRevenue) * (w - 80)) : 0;
          pdf.setFillColor(230, 235, 245);
          pdf.roundedRect(14, y, w - 80, 7, 1.5, 1.5, 'F');
          pdf.setFillColor(37, 99, 235);
          if (barW > 0) pdf.roundedRect(14, y, Math.max(barW, 3), 7, 1.5, 1.5, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(40, 40, 50);
          pdf.text(`${m.name}`, 16, y + 5);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${formatCurrency(m.value)} (${pct}%)`, w - 62, y + 5);
          y += 10;
        });
        y += 3;
      }

      // Section 7: Clientes
      checkPage(20);
      y = drawSectionTitle('Clientes', y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 70);
      pdf.text(`Total de clientes registrados: ${stats.customerCount}`, 14, y + 2);
      y += 10;

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        pdf.setPage(p);
        const ph = pdf.internal.pageSize.getHeight();
        pdf.setDrawColor(230, 230, 235);
        pdf.line(14, ph - 12, w - 14, ph - 12);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(160, 170, 190);
        pdf.text(`${orgName} — Informe Financiero — ${range.label}`, 14, ph - 7);
        pdf.text(`Página ${p} de ${pageCount}`, w - 14, ph - 7, { align: 'right' });
      }

      const safeOrgName = orgName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '');
      pdf.save(`${safeOrgName} - Informe Financiero ${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setExporting(false);
    }
  }, [stats, tenant, range]);

  return (
    <Layout>
      <div className="page-container space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Informe Financiero</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{tenant?.name} — {range.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" />
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <CalendarDays className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="this_month">Este mes</SelectItem>
                <SelectItem value="last_month">Mes pasado</SelectItem>
                <SelectItem value="30days">Últimos 30 días</SelectItem>
                <SelectItem value="3months">Últimos 3 meses</SelectItem>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="year">Último año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ═══ RESUMEN PRINCIPAL ═══ */}
        <SectionTitle icon={Activity} title="Resumen General" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI icon={DollarSign} label="Ingresos Totales" value={formatCurrency(stats.totalIncome)} sub={`${stats.salesCount} ventas + ${stats.deliveredCount} reparaciones`} accent="blue" trend="up" />
          <KPI icon={TrendingDown} label="Gastos Totales" value={formatCurrency(stats.totalExpenses)} sub={`${stats.purchasesCount} compras realizadas`} accent="red" trend="down" />
          <KPI icon={Wallet} label="Ganancia Neta" value={formatCurrency(stats.netProfit)} sub={stats.netProfit >= 0 ? 'Balance positivo ✓' : '⚠ Balance negativo'} accent={stats.netProfit >= 0 ? 'green' : 'red'} />
          <KPI icon={TrendingUp} label="Margen Bruto" value={`${stats.grossMargin.toFixed(1)}%`} sub={`Ganancia: ${formatCurrency(stats.grossProfit)}`} />
        </div>

        {/* ═══ VENTAS ═══ */}
        <SectionTitle icon={ShoppingCart} title="Detalle de Ventas" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI icon={ShoppingCart} label="Ventas" value={formatCurrency(stats.salesRevenue)} sub={`${stats.salesCount} transacciones`} accent="blue" />
          <KPI icon={Package} label="Costo de Ventas" value={formatCurrency(stats.cogs)} sub="COGS del período" />
          <KPI icon={DollarSign} label="Ticket Promedio" value={formatCurrency(stats.avgTicket)} />
          <KPI icon={Wrench} label="Ingresos Taller" value={formatCurrency(stats.repairRevenue)} sub={`${stats.deliveredCount} entregadas`} accent="green" />
        </div>

        {/* ═══ CRÉDITOS & COBROS ═══ */}
        <SectionTitle icon={CreditCard} title="Créditos y Cuentas por Cobrar" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPI icon={CreditCard} label="Intereses Cobrados" value={formatCurrency(stats.loanInterest)} sub="Financiamientos" accent="green" />
          <KPI icon={CreditCard} label="Cartera de Crédito" value={formatCurrency(stats.loanPending)} sub={`${stats.activeLoans} activos`} accent="blue" />
          <KPI icon={DollarSign} label="Cuentas por Cobrar" value={formatCurrency(stats.arPending)} accent="red" />
          <KPI icon={Users} label="Clientes" value={String(stats.customerCount)} />
        </div>

        {/* ═══ INVENTARIO ═══ */}
        <SectionTitle icon={Package} title="Estado del Inventario" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KPI icon={Package} label="Disponible" value={`${stats.inventoryCount} unidades`} accent="blue" />
          <KPI icon={DollarSign} label="Valor en Venta" value={formatCurrency(stats.inventoryValue)} accent="green" />
          <KPI icon={TrendingUp} label="Margen Potencial" value={formatCurrency(stats.inventoryValue - stats.inventoryCost)} sub={`Costo: ${formatCurrency(stats.inventoryCost)}`} accent="green" />
        </div>

        {/* ═══ GRÁFICOS ═══ */}
        <SectionTitle icon={BarChart3} title="Análisis Visual" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Daily trend – wider */}
          <Card className="lg:col-span-3 border-border/60">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" /> Tendencia Diaria de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={dailyTrend}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(212,100%,56%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(212,100%,56%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,18%)" />
                  <XAxis dataKey="date" stroke="hsl(215,15%,50%)" fontSize={9} interval={Math.max(0, Math.floor(dailyTrend.length / 8))} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215,15%,50%)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={35} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Ventas']} />
                  <Line type="monotone" dataKey="ventas" stroke="hsl(212,100%,56%)" strokeWidth={2.5} dot={false} fill="url(#salesGradient)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment method pie – narrower */}
          <Card className="lg:col-span-2 border-border/60">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <PieChartIcon className="h-3.5 w-3.5 text-primary" /> Métodos de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {stats.byMethod.length > 0 ? (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={stats.byMethod} cx="50%" cy="50%" innerRadius={40} outerRadius={68} dataKey="value" paddingAngle={4} strokeWidth={0}>
                        {stats.byMethod.map((_, i) => <Cell key={i} fill={methodColors[i % methodColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatCurrency(v)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5">
                    {stats.byMethod.map((d, i) => {
                      const pct = stats.salesRevenue > 0 ? ((d.value / stats.salesRevenue) * 100).toFixed(0) : '0';
                      return (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: methodColors[i % methodColors.length] }} />
                          <span className="text-muted-foreground flex-1">{d.name}</span>
                          <span className="font-medium text-foreground">{formatCurrency(d.value)}</span>
                          <span className="text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-sm text-muted-foreground">Sin ventas en este período</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly comparison – full width */}
          <Card className="lg:col-span-5 border-border/60">
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-primary" /> Ventas vs Gastos — Últimos 12 Meses
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={260}>
                <RechartsBarChart data={monthlyTrend} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,15%,18%)" />
                  <XAxis dataKey="month" stroke="hsl(215,15%,50%)" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215,15%,50%)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name === 'ventas' ? 'Ventas' : name === 'gastos' ? 'Gastos' : 'Neto']} />
                  <Bar dataKey="ventas" fill="hsl(212,100%,56%)" name="Ventas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="hsl(0,60%,50%)" name="Gastos" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="neto" stroke="hsl(142,72%,50%)" strokeWidth={2} name="Neto" dot={false} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
