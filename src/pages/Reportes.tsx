import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { useRole } from '@/hooks/useRole';
import { formatCurrency } from '@/lib/currency';
import { printSaleReceipt, printRepairReceipt } from '@/components/PrintReceipt';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Eye, Printer, CalendarDays, Filter, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Sale, Repair } from '@/types';
import { toast } from 'sonner';

export default function Reportes() {
  const { sales, repairs, deleteSale } = useStore();
  const { tenant } = useAuth();
  const { canDelete } = useRole();
  const [tab, setTab] = useState('ventas');
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case 'today': return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
      case '7days': return { start: subDays(new Date(), 7), end: new Date() };
      case '30days': return { start: subDays(new Date(), 30), end: new Date() };
      case 'this_month': return { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };
      case 'last_month': { const lm = subMonths(new Date(), 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
      default: return null;
    }
  };

  const filteredSales = useMemo(() => {
    let result = [...sales];
    const range = getDateRange(dateFilter);
    if (range) {
      result = result.filter(s => {
        try { return isWithinInterval(parseISO(s.sold_at), range); } catch { return false; }
      });
    }
    if (paymentFilter !== 'all') {
      result = result.filter(s => s.payment_method === paymentFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.customer_name.toLowerCase().includes(q) ||
        s.sale_items?.some(si => si.brand.toLowerCase().includes(q) || si.model.toLowerCase().includes(q) || si.imei?.toLowerCase().includes(q))
      );
    }
    return result.sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime()).slice(0, 100);
  }, [sales, search, dateFilter, paymentFilter]);

  const filteredRepairs = useMemo(() => {
    let result = [...repairs];
    const range = getDateRange(dateFilter);
    if (range) {
      result = result.filter(r => {
        try { return isWithinInterval(parseISO(r.received_at), range); } catch { return false; }
      });
    }
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.customer_name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        r.imei?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()).slice(0, 100);
  }, [repairs, search, dateFilter, statusFilter]);

  const paymentLabels: Record<string, string> = { cash: 'Contado', financing: 'Financiado', credit: 'Crédito' };
  const statusLabels: Record<string, string> = {
    recibido: 'Recibido', diagnosticando: 'Diagnosticando', espera_pieza: 'Espera Pieza',
    en_proceso: 'En Proceso', en_prueba: 'En Prueba', listo: 'Listo', entregado: 'Entregado', no_se_pudo: 'No se pudo',
  };

  const salesTotal = filteredSales.reduce((s, sale) => s + sale.total_amount, 0);
  const repairsTotal = filteredRepairs.reduce((s, r) => s + r.total_price, 0);

  const handleDeleteSale = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSale(saleToDelete);
      toast.success('Venta eliminada correctamente');
      setSelectedSale(null);
      setSaleToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar la venta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Historial</h1>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setSearch(''); setDateFilter('all'); setPaymentFilter('all'); setStatusFilter('all'); }}>
          <TabsList>
            <TabsTrigger value="ventas">Ventas</TabsTrigger>
            <TabsTrigger value="taller">Reparaciones</TabsTrigger>
          </TabsList>

          {/* VENTAS */}
          <TabsContent value="ventas" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar cliente, producto, IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="7days">Últimos 7 días</SelectItem>
                  <SelectItem value="30days">Últimos 30 días</SelectItem>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="last_month">Mes pasado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Contado</SelectItem>
                  <SelectItem value="financing">Financiado</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary bar */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
              <span className="text-muted-foreground">{filteredSales.length} ventas encontradas</span>
              <span className="font-bold text-primary">{formatCurrency(salesTotal)}</span>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map(sale => (
                    <TableRow key={sale.id} className="table-row-hover cursor-pointer" onClick={() => setSelectedSale(sale)}>
                      <TableCell className="text-sm whitespace-nowrap">{format(parseISO(sale.sold_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{sale.customer_name}</p>
                        {sale.customer_phone && <p className="text-[11px] text-muted-foreground">{sale.customer_phone}</p>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {(sale.sale_items || []).map(si => `${si.brand} ${si.model}`).join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{paymentLabels[sale.payment_method] || sale.payment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSales.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay ventas con estos filtros</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* TALLER */}
          <TabsContent value="taller" className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar cliente, equipo, IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="7days">Últimos 7 días</SelectItem>
                  <SelectItem value="30days">Últimos 30 días</SelectItem>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="last_month">Mes pasado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recibido">Recibido</SelectItem>
                  <SelectItem value="diagnosticando">Diagnosticando</SelectItem>
                  <SelectItem value="espera_pieza">Espera Pieza</SelectItem>
                  <SelectItem value="en_proceso">En Proceso</SelectItem>
                  <SelectItem value="listo">Listo</SelectItem>
                  <SelectItem value="entregado">Entregado</SelectItem>
                  <SelectItem value="no_se_pudo">No se pudo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
              <span className="text-muted-foreground">{filteredRepairs.length} reparaciones encontradas</span>
              <span className="font-bold text-primary">{formatCurrency(repairsTotal)}</span>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Falla</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRepairs.map(repair => (
                    <TableRow key={repair.id} className="table-row-hover cursor-pointer" onClick={() => setSelectedRepair(repair)}>
                      <TableCell className="text-sm whitespace-nowrap">{format(parseISO(repair.received_at), 'dd/MM/yy')}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{repair.customer_name}</p>
                        {repair.customer_phone && <p className="text-[11px] text-muted-foreground">{repair.customer_phone}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{repair.brand} {repair.model}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{repair.reported_fault}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{statusLabels[repair.status] || repair.status}</Badge></TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatCurrency(repair.total_price)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRepairs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay reparaciones con estos filtros</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Sale Detail Dialog */}
        <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            {selectedSale && (
              <>
                <DialogHeader>
                  <DialogTitle>Venta #{selectedSale.id.slice(0, 8).toUpperCase()}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground text-xs">Fecha</span><p>{new Date(selectedSale.sold_at).toLocaleString('es-DO')}</p></div>
                    <div><span className="text-muted-foreground text-xs">Método</span><p>{paymentLabels[selectedSale.payment_method] || selectedSale.payment_method}</p></div>
                    <div><span className="text-muted-foreground text-xs">Cliente</span><p className="font-medium">{selectedSale.customer_name}</p></div>
                    {selectedSale.customer_phone && <div><span className="text-muted-foreground text-xs">Teléfono</span><p>{selectedSale.customer_phone}</p></div>}
                    {selectedSale.customer_cedula && <div><span className="text-muted-foreground text-xs">Cédula</span><p>{selectedSale.customer_cedula}</p></div>}
                  </div>
                  <Separator />
                  <p className="font-semibold text-xs uppercase text-muted-foreground">Productos</p>
                  {(selectedSale.sale_items || []).map((item) => (
                    <div key={item.id} className="flex justify-between items-center rounded-lg bg-muted/50 p-2">
                      <div>
                        <p className="font-medium">{item.brand} {item.model}</p>
                        {item.color && <p className="text-xs text-muted-foreground">{item.color}</p>}
                        {item.imei && <p className="text-xs text-muted-foreground font-mono">IMEI: {item.imei}</p>}
                        {item.quantity > 1 && <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>}
                      </div>
                      <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                    </div>
                  ))}
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-bold text-lg">{formatCurrency(selectedSale.total_amount)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Recibido</span><span>{formatCurrency(selectedSale.amount_received)}</span></div>
                    {selectedSale.change_given > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cambio</span><span>{formatCurrency(selectedSale.change_given)}</span></div>}
                  </div>
                  {selectedSale.notes && <div><span className="text-muted-foreground text-xs">Notas</span><p className="text-xs">{selectedSale.notes}</p></div>}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={isPrinting} onClick={async () => {
                    setIsPrinting(true);
                    try {
                      let installments: any = undefined;
                      if (selectedSale.payment_method === 'financing') {
                        const { data: loan } = await supabase.from('loans').select('*, loan_installments(*)').eq('sale_id', selectedSale.id).maybeSingle();
                        if (loan && loan.loan_installments) {
                          // Sort installments by number
                          installments = loan.loan_installments.sort((a: any, b: any) => a.installment_number - b.installment_number);
                        }
                      }

                      let batteryHealth, condition, grade;
                      const firstItem = selectedSale.sale_items?.[0];
                      if (firstItem?.inventory_item_id) {
                        const { data: invObj } = await supabase.from('inventory_items').select('battery_health, condition, grade').eq('id', firstItem.inventory_item_id).maybeSingle();
                        if (invObj) {
                          batteryHealth = invObj.battery_health;
                          condition = invObj.condition;
                          grade = invObj.grade;
                        }
                      }

                      // Reconstruct receipt options from sale data for faithful reprint
                      const opts: import('@/components/PrintReceipt').SaleReceiptOptions = {
                        warrantyText: tenant?.warranty_text,
                        batteryHealth,
                        condition,
                        grade,
                      };
                      // Parse trade-in info from notes
                      if (selectedSale.notes) {
                        const tradeInMatches = selectedSale.notes.match(/Trade-In: ([^|]+)/g);
                        if (tradeInMatches) {
                          opts.tradeInDevices = tradeInMatches.map(m => {
                            const imeiMatch = m.match(/\(IMEI: ([^)]+)\)/);
                            const imei = imeiMatch ? imeiMatch[1] : undefined;

                            const condMatch = m.match(/\[Cond: ([^\]]+)\]/);
                            const condition = condMatch ? condMatch[1] : undefined;

                            const batMatch = m.match(/\[Bat: ([0-9]+)%\]/);
                            const batteryHealth = batMatch ? parseInt(batMatch[1]) : undefined;

                            const priceMatch = m.match(/—\s*(.+)$/);
                            const valueStr = priceMatch ? priceMatch[1].replace(/[^0-9.]/g, '') : '0';

                            let deviceStr = m.replace('Trade-In:', '').replace(/—.*$/, '');
                            if (imeiMatch) deviceStr = deviceStr.replace(imeiMatch[0], '');
                            if (condMatch) deviceStr = deviceStr.replace(condMatch[0], '');
                            if (batMatch) deviceStr = deviceStr.replace(batMatch[0], '');
                            deviceStr = deviceStr.trim();

                            const firstSpace = deviceStr.indexOf(' ');
                            let brand = deviceStr;
                            let model = '';
                            if (firstSpace !== -1) {
                              brand = deviceStr.slice(0, firstSpace);
                              model = deviceStr.slice(firstSpace + 1).trim();
                            }

                            return {
                              brand,
                              model,
                              imei,
                              value: parseFloat(valueStr) || 0,
                              condition,
                              batteryHealth
                            };
                          });
                          opts.tradeInTotal = opts.tradeInDevices.reduce((s, t) => s + t.value, 0);

                          // Retroactively fetch missing details for older trade-ins
                          if (opts.tradeInDevices.length > 0 && !opts.tradeInDevices[0].condition) {
                            const { data: purchaseData } = await supabase.from('purchases').select('id').eq('notes', `Trade-In desde venta #${selectedSale.id.slice(0, 8).toUpperCase()}`).maybeSingle();
                            if (purchaseData) {
                              const { data: invItems } = await supabase.from('inventory_items').select('condition, battery_health, imei, products(name)').eq('purchase_id', purchaseData.id);
                              if (invItems && invItems.length > 0) {
                                opts.tradeInDevices = opts.tradeInDevices.map(t => {
                                  const match = invItems.find((inv: any) => (inv.imei && inv.imei === t.imei) || (inv.products?.name && t.model.includes(inv.products.name)));
                                  if (match) {
                                    return { ...t, condition: match.condition, batteryHealth: match.battery_health };
                                  }
                                  return t;
                                });
                              }
                            }
                          }
                        }
                      }
                      printSaleReceipt(selectedSale, installments, tenant?.name, opts, tenant?.logo_url || undefined);
                    } catch (err) {
                      console.error('Error fetching print details', err);
                      // Fallback print if fetch fails
                      printSaleReceipt(selectedSale, undefined, tenant?.name, { warrantyText: tenant?.warranty_text }, tenant?.logo_url || undefined);
                    } finally {
                      setIsPrinting(false);
                    }
                  }}>
                    <Printer className="h-4 w-4 mr-2" /> {isPrinting ? 'Generando...' : 'Reimprimir Factura'}
                  </Button>
                  {canDelete && (
                    <Button variant="destructive" size="icon" onClick={() => setSaleToDelete(selectedSale.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Repair Detail Dialog */}
        <Dialog open={!!selectedRepair} onOpenChange={(open) => !open && setSelectedRepair(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            {selectedRepair && (
              <>
                <DialogHeader>
                  <DialogTitle>Reparación #{selectedRepair.id.slice(0, 8).toUpperCase()}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground text-xs">Fecha Recepción</span><p>{new Date(selectedRepair.received_at).toLocaleString('es-DO')}</p></div>
                    <div><span className="text-muted-foreground text-xs">Estado</span><p><Badge variant="secondary">{statusLabels[selectedRepair.status] || selectedRepair.status}</Badge></p></div>
                    <div><span className="text-muted-foreground text-xs">Cliente</span><p className="font-medium">{selectedRepair.customer_name}</p></div>
                    {selectedRepair.customer_phone && <div><span className="text-muted-foreground text-xs">Teléfono</span><p>{selectedRepair.customer_phone}</p></div>}
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-muted-foreground text-xs">Equipo</span><p className="font-medium">{selectedRepair.brand} {selectedRepair.model}</p></div>
                    {selectedRepair.color && <div><span className="text-muted-foreground text-xs">Color</span><p>{selectedRepair.color}</p></div>}
                    {selectedRepair.imei && <div><span className="text-muted-foreground text-xs">IMEI</span><p className="font-mono text-xs">{selectedRepair.imei}</p></div>}
                  </div>
                  <Separator />
                  <div><span className="text-muted-foreground text-xs">Falla Reportada</span><p>{selectedRepair.reported_fault}</p></div>
                  {selectedRepair.technician_notes && <div><span className="text-muted-foreground text-xs">Notas Técnico</span><p>{selectedRepair.technician_notes}</p></div>}
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Mano de obra</span><span>{formatCurrency(selectedRepair.labor_cost)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Piezas</span><span>{formatCurrency(selectedRepair.parts_cost)}</span></div>
                    <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(selectedRepair.total_price)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Adelanto</span><span>{formatCurrency(selectedRepair.advance)}</span></div>
                    <div className="flex justify-between font-medium text-primary"><span>Pendiente</span><span>{formatCurrency(selectedRepair.balance)}</span></div>
                  </div>
                </div>
                <Button className="w-full" onClick={() => printRepairReceipt(selectedRepair, tenant?.name, tenant?.logo_url || undefined)}>
                  <Printer className="h-4 w-4 mr-2" /> Reimprimir Recibo de Taller
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Sale Confirmation */}
        <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará la venta y restaurará los productos al inventario. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSale} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
