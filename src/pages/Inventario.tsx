import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { useRole } from '@/hooks/useRole';
import { useLowStockThreshold } from '@/hooks/useLowStockThreshold';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Package, Search, ChevronRight, Eye, Battery, Smartphone, Headphones, Wrench, PackagePlus, AlertTriangle, Pencil, Plus, Layers, Upload, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { AddInventoryDialog } from '@/components/AddInventoryDialog';
import { BatchInventoryDialog } from '@/components/BatchInventoryDialog';
import type { InventoryItem, Product } from '@/types';

const db = supabase as any;

interface GroupedProduct {
  product: Product;
  items: InventoryItem[];
  available: number;
  total: number;
  priceRange: [number, number];
}

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  disponible: { label: 'Disponible', class: 'bg-status-ok-bg text-status-ok' },
  vendido: { label: 'Vendido', class: 'bg-status-done-bg text-status-done' },
  reservado: { label: 'Reservado', class: 'bg-status-waiting-bg text-status-waiting' },
  en_reparacion: { label: 'En Reparación', class: 'bg-status-process-bg text-status-process' },
};

export default function Inventario() {
  const { inventory } = useStore();
  const { canViewFinancials, canEdit } = useRole();
  const { threshold: lowStockThreshold } = useLowStockThreshold();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Restock state
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restocking, setRestocking] = useState(false);

  // Edit item state
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditDialog = (item: InventoryItem) => {
    setEditItem(item);
    setEditForm({
      brand: item.product?.brand || '',
      model: item.product?.name || '',
      color: item.product?.color || '',
      capacity: item.product?.capacity || '',
      category: item.product?.category || 'celular',
      imei: item.imei || '',
      serial: item.serial || '',
      condition: item.condition || 'usado',
      grade: item.grade || '',
      battery_health: item.battery_health ?? '',
      is_new: item.is_new,
      purchase_cost: item.purchase_cost,
      sale_price: item.sale_price,
      min_price: item.min_price || 0,
      status: item.status,
      quantity: item.quantity || 1,
      notes: item.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    try {
      // Update product info
      if (editItem.product_id) {
        const { error: pErr } = await db.from('products').update({
          brand: editForm.brand,
          name: editForm.model,
          color: editForm.color,
          capacity: editForm.capacity || null,
          category: editForm.category,
          base_price: parseFloat(editForm.sale_price) || 0,
        }).eq('id', editItem.product_id);
        if (pErr) throw pErr;
      }
      // Update inventory item
      const { error } = await db.from('inventory_items').update({
        imei: editForm.imei || null,
        serial: editForm.serial || null,
        condition: editForm.condition,
        grade: editForm.grade || null,
        battery_health: editForm.battery_health ? parseInt(editForm.battery_health) : null,
        is_new: editForm.is_new,
        purchase_cost: parseFloat(editForm.purchase_cost) || 0,
        sale_price: parseFloat(editForm.sale_price) || 0,
        min_price: parseFloat(editForm.min_price) || 0,
        status: editForm.status,
        quantity: parseInt(editForm.quantity) || 1,
        notes: editForm.notes || null,
      }).eq('id', editItem.id);
      if (error) throw error;
      toast.success('Producto actualizado correctamente');
      setEditItem(null);
      qc.invalidateQueries({ queryKey: ['inventory', tenantId] });
      qc.invalidateQueries({ queryKey: ['products', tenantId] });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const brands = useMemo(() => {
    const set = new Set(inventory.map((i) => i.product?.brand).filter(Boolean));
    return [...set].sort();
  }, [inventory]);

  const grouped = useMemo((): GroupedProduct[] => {
    const filtered = inventory.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch = !search || item.product?.brand.toLowerCase().includes(q) || item.product?.name.toLowerCase().includes(q) || item.imei?.toLowerCase().includes(q) || item.product?.color.toLowerCase().includes(q);
      const matchesBrand = brandFilter === 'todas' || item.product?.brand === brandFilter;
      const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;
      return matchesSearch && matchesBrand && matchesStatus;
    });

    const map = new Map<string, GroupedProduct>();
    filtered.forEach((item) => {
      const p = item.product;
      if (!p) return;
      const key = `${p.brand}-${p.name}-${p.color}-${p.capacity || ''}`;
      if (!map.has(key)) {
        map.set(key, { product: p, items: [], available: 0, total: 0, priceRange: [Infinity, 0] });
      }
      const group = map.get(key)!;
      group.items.push(item);
      const qty = item.quantity || 1;
      group.total += qty;
      if (item.status === 'disponible') group.available += qty;
      group.priceRange = [Math.min(group.priceRange[0], item.sale_price), Math.max(group.priceRange[1], item.sale_price)];
    });

    return [...map.values()].sort((a, b) => a.product.brand.localeCompare(b.product.brand) || a.product.name.localeCompare(b.product.name));
  }, [inventory, search, brandFilter, statusFilter]);

  const totalAvailable = inventory.filter((i) => i.status === 'disponible').reduce((s, i) => s + (i.quantity || 1), 0);
  const totalValue = inventory.filter((i) => i.status === 'disponible').reduce((s, i) => s + i.sale_price * (i.quantity || 1), 0);

  const lowStockItems = useMemo(() => {
    return grouped.filter((g) => g.available > 0 && g.available <= lowStockThreshold);
  }, [grouped, lowStockThreshold]);

  const handleRestock = async () => {
    if (!restockItem) return;
    const qty = parseInt(restockQty) || 0;
    if (qty <= 0) { toast.error('Ingresa una cantidad válida'); return; }

    setRestocking(true);
    try {
      const newQty = (restockItem.quantity || 1) + qty;
      const { error } = await db.from('inventory_items').update({
        quantity: newQty,
        status: 'disponible',
      }).eq('id', restockItem.id);
      if (error) throw error;
      toast.success(`Stock actualizado: +${qty} unidades`);
      setRestockItem(null);
      setRestockQty('');
      qc.invalidateQueries({ queryKey: ['inventory', tenantId] });
    } catch (err: any) {
      toast.error('Error al reabastecer: ' + err.message);
    } finally {
      setRestocking(false);
    }
  };

  const handlePrintLabels = (group: GroupedProduct) => {
    const items = group.items
      .filter((item) => item.imei && item.status === 'disponible')
      .map((item) => ({
        imei: item.imei!,
        brand: group.product.brand,
        model: group.product.name,
        color: item.product?.color || group.product.color,
        capacity: item.product?.capacity || group.product.capacity || '',
        batteryHealth: item.battery_health,
        condition: item.condition,
        grade: item.grade,
      }));

    if (items.length === 0) {
      toast.error('No hay IMEIs disponibles para imprimir');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('No se pudo abrir la ventana de impresión'); return; }

    const labelsHtml = items.map((item) => `
      <div class="label">
        <div style="font-weight:bold;font-size:13px;margin-bottom:2px;">${item.brand} ${item.model}</div>
        <div style="font-size:10px;color:#555;">
          ${item.color}${item.capacity ? ' · ' + item.capacity : ''}${item.batteryHealth ? ' · 🔋' + item.batteryHealth + '%' : ''}${item.grade ? ' · ' + item.grade : ''}
        </div>
        <svg class="barcode" data-imei="${item.imei}"></svg>
        <div style="font-size:9px;color:#888;margin-top:1px;">IMEI: ${item.imei}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Etiquetas - ${group.product.brand} ${group.product.name}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: sans-serif; padding: 10px; }
        h3 { margin-bottom: 10px; }
        .labels { display: flex; flex-wrap: wrap; gap: 6px; }
        .label {
          border: 1px solid #ccc; padding: 8px 12px; display: inline-block;
          min-width: 240px; font-family: monospace; font-size: 11px;
          page-break-inside: avoid; text-align: center;
        }
        .barcode { display: block; margin: 4px auto; }
        @media print { @page { margin: 4mm; } body { padding: 0; } }
      </style>
      </head><body>
      <h3>${group.product.brand} ${group.product.name} - ${items.length} etiqueta(s)</h3>
      <div class="labels">${labelsHtml}</div>
      <script>
        document.querySelectorAll('.barcode').forEach(function(svg) {
          try {
            JsBarcode(svg, svg.dataset.imei, {
              format: 'CODE128', width: 1.5, height: 40,
              displayValue: false, margin: 0
            });
          } catch(e) { svg.style.display = 'none'; }
        });
        window.onload = function() { setTimeout(function() { window.print(); }, 400); };
      </script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Inventario</h1>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Agregar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBatchDialogOpen(true)}>
                  <Layers className="mr-2 h-4 w-4" /> Lote
                </Button>
              </>
            )}
            <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <span><strong className="text-foreground">{totalAvailable}</strong> disponibles</span>
              {canViewFinancials && <span>Valor: <strong className="text-foreground">{formatCurrency(totalValue)}</strong></span>}
            </div>
          </div>
        </div>

        {/* Low stock alert */}
        {lowStockItems.length > 0 && (
          <Alert className="border-status-waiting/30 bg-status-waiting-bg">
            <AlertTriangle className="h-4 w-4 text-status-waiting" />
            <AlertTitle className="text-sm font-semibold text-status-waiting">
              Stock Bajo ({lowStockItems.length} producto{lowStockItems.length > 1 ? 's' : ''})
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              {lowStockItems.slice(0, 5).map((g) => (
                <span key={`${g.product.brand}-${g.product.name}`} className="inline-flex items-center gap-1 mr-3">
                  <strong className="text-foreground">{g.product.brand} {g.product.name}</strong>
                  <Badge variant="secondary" className="text-[10px]">{g.available} uds</Badge>
                </span>
              ))}
              {lowStockItems.length > 5 && <span className="text-muted-foreground">y {lowStockItems.length - 5} más...</span>}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por marca, modelo o IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex gap-2">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las marcas</SelectItem>
                {brands.map((b) => <SelectItem key={b as string} value={b as string}>{b as string}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="vendido">Vendido</SelectItem>
                <SelectItem value="reservado">Reservado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grouped list */}
        <div className="space-y-2">
          {grouped.map((group) => {
            const priceStr = group.priceRange[0] === group.priceRange[1]
              ? formatCurrency(group.priceRange[0])
              : `${formatCurrency(group.priceRange[0])} — ${formatCurrency(group.priceRange[1])}`;
            const isAcc = group.product.category === 'accesorio';
            const isSpare = group.product.category === 'repuesto';
            const CategoryIcon = isSpare ? Wrench : isAcc ? Headphones : Smartphone;

            return (
              <Collapsible key={`${group.product.brand}-${group.product.name}-${group.product.color}-${group.product.capacity}`}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 sm:gap-3 rounded-xl border bg-card p-3 hover:bg-muted/50 transition-all duration-150 text-left group">
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90 shrink-0" />
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <CategoryIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{group.product.brand} {group.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">{group.product.color}{group.product.capacity ? ` · ${group.product.capacity}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm shrink-0">
                    {group.available > 0 && group.available <= lowStockThreshold && (
                      <AlertTriangle className="h-3.5 w-3.5 text-status-waiting shrink-0" />
                    )}
                    {!isAcc && !isSpare && group.items.some((item) => item.imei && item.status === 'disponible') && (
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={(e) => { e.stopPropagation(); handlePrintLabels(group); }}
                        title="Imprimir etiquetas IMEI"
                      >
                        <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    <Badge variant="secondary" className="text-[10px]">{group.available}/{group.total}</Badge>
                    <span className="font-medium hidden sm:inline">{priceStr}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 sm:ml-10 mt-1 rounded-xl border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          {(isAcc || isSpare)
                            ? <TableHead className="text-xs">Cant.</TableHead>
                            : <TableHead className="text-xs">IMEI</TableHead>
                          }
                          <TableHead className="text-xs hidden sm:table-cell">Condición</TableHead>
                          {!isAcc && !isSpare && <TableHead className="text-xs">Grado</TableHead>}
                          {!isAcc && !isSpare && <TableHead className="text-xs hidden sm:table-cell">Batería</TableHead>}
                          {canViewFinancials && <TableHead className="text-xs text-right hidden md:table-cell">Costo</TableHead>}
                          <TableHead className="text-xs text-right">Precio</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((item) => {
                          const st = STATUS_LABELS[item.status] || STATUS_LABELS.disponible;
                          return (
                            <TableRow key={item.id} className="table-row-hover cursor-pointer">
                              {(isAcc || isSpare)
                                ? <TableCell className="text-xs font-medium">{item.quantity}</TableCell>
                                : <TableCell className="text-xs font-mono">{item.imei || '—'}</TableCell>
                              }
                              <TableCell className="text-xs capitalize hidden sm:table-cell">{item.condition}</TableCell>
                              {!isAcc && !isSpare && <TableCell className="text-xs">{item.grade || '—'}</TableCell>}
                              {!isAcc && !isSpare && (
                                <TableCell className="text-xs hidden sm:table-cell">
                                  {item.battery_health ? (
                                    <span className="flex items-center gap-1">
                                      <Battery className={`h-3 w-3 ${item.battery_health >= 80 ? 'text-status-ok' : 'text-status-waiting'}`} />
                                      {item.battery_health}%
                                    </span>
                                  ) : '—'}
                                </TableCell>
                              )}
                              {canViewFinancials && <TableCell className="text-xs text-right hidden md:table-cell">{formatCurrency(item.purchase_cost)}</TableCell>}
                              <TableCell className="text-xs text-right font-medium">{formatCurrency(item.sale_price)}</TableCell>
                              <TableCell><span className={`status-badge text-[10px] ${st.class}`}>{st.label}</span></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedItem(item)}>
                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                  {canEdit && item.status === 'disponible' && (
                                    <Button
                                      variant="ghost" size="icon" className="h-6 w-6"
                                      onClick={(e) => { e.stopPropagation(); openEditDialog(item); }}
                                      title="Editar producto"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  )}
                                  {(isAcc || isSpare) && item.status === 'disponible' && (
                                    <Button
                                      variant="ghost" size="icon" className="h-6 w-6"
                                      onClick={(e) => { e.stopPropagation(); setRestockItem(item); setRestockQty(''); }}
                                      title="Reabastecer"
                                    >
                                      <PackagePlus className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {grouped.length === 0 && (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <p className="text-sm">No se encontraron productos</p>
            </div>
          )}
        </div>

        {/* Detail dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-md">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg">{selectedItem.product?.brand} {selectedItem.product?.name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground text-xs">Color</span><p>{selectedItem.product?.color}</p></div>
                  {selectedItem.product?.capacity && <div><span className="text-muted-foreground text-xs">Capacidad</span><p>{selectedItem.product.capacity}</p></div>}
                  {selectedItem.imei && <div><span className="text-muted-foreground text-xs">IMEI</span><p className="font-mono text-xs">{selectedItem.imei}</p></div>}
                  {selectedItem.serial && <div><span className="text-muted-foreground text-xs">Serial</span><p>{selectedItem.serial}</p></div>}
                  <div><span className="text-muted-foreground text-xs">Condición</span><p className="capitalize">{selectedItem.condition}</p></div>
                  {selectedItem.grade && <div><span className="text-muted-foreground text-xs">Grado</span><p>{selectedItem.grade}</p></div>}
                  {selectedItem.battery_health && <div><span className="text-muted-foreground text-xs">Batería</span><p>{selectedItem.battery_health}%</p></div>}
                  <div><span className="text-muted-foreground text-xs">Nuevo</span><p>{selectedItem.is_new ? 'Sí' : 'No'}</p></div>
                  {(selectedItem.product?.category === 'accesorio' || selectedItem.product?.category === 'repuesto') && (
                    <div><span className="text-muted-foreground text-xs">Cantidad</span><p className="font-medium">{selectedItem.quantity}</p></div>
                  )}
                  {canViewFinancials && (
                    <>
                      <div><span className="text-muted-foreground text-xs">Costo</span><p>{formatCurrency(selectedItem.purchase_cost)}</p></div>
                      <div><span className="text-muted-foreground text-xs">Margen</span><p className="text-status-ok">{formatCurrency(selectedItem.sale_price - selectedItem.purchase_cost)}</p></div>
                    </>
                  )}
                  <div><span className="text-muted-foreground text-xs">Precio Venta</span><p className="font-bold text-base">{formatCurrency(selectedItem.sale_price)}</p></div>
                  <div>
                    <span className="text-muted-foreground text-xs">Estado</span>
                    <p><span className={`status-badge text-[10px] mt-1 ${(STATUS_LABELS[selectedItem.status] || STATUS_LABELS.disponible).class}`}>
                      {(STATUS_LABELS[selectedItem.status] || STATUS_LABELS.disponible).label}
                    </span></p>
                  </div>
                  {selectedItem.notes && <div className="col-span-2"><span className="text-muted-foreground text-xs">Notas</span><p>{selectedItem.notes}</p></div>}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit item dialog */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            {editItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base flex items-center gap-2">
                    <Pencil className="h-5 w-5 text-primary" />
                    Editar Producto
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Marca</Label>
                      <Input value={editForm.brand} onChange={(e) => setEditForm({...editForm, brand: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Modelo</Label>
                      <Input value={editForm.model} onChange={(e) => setEditForm({...editForm, model: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Color</Label>
                      <Input value={editForm.color} onChange={(e) => setEditForm({...editForm, color: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Capacidad</Label>
                      <Input value={editForm.capacity} onChange={(e) => setEditForm({...editForm, capacity: e.target.value})} placeholder="Ej: 128GB" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Categoría</Label>
                      <Select value={editForm.category} onValueChange={(v) => setEditForm({...editForm, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="celular">Celular</SelectItem>
                          <SelectItem value="accesorio">Accesorio</SelectItem>
                          <SelectItem value="repuesto">Repuesto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Estado</Label>
                      <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="vendido">Vendido</SelectItem>
                          <SelectItem value="reservado">Reservado</SelectItem>
                          <SelectItem value="en_reparacion">En Reparación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">IMEI</Label>
                      <Input value={editForm.imei} onChange={(e) => setEditForm({...editForm, imei: e.target.value})} placeholder="IMEI" />
                    </div>
                    <div>
                      <Label className="text-xs">Serial</Label>
                      <Input value={editForm.serial} onChange={(e) => setEditForm({...editForm, serial: e.target.value})} placeholder="Serial" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Condición</Label>
                      <Select value={editForm.condition} onValueChange={(v) => setEditForm({...editForm, condition: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nuevo">Nuevo</SelectItem>
                          <SelectItem value="usado">Usado</SelectItem>
                          <SelectItem value="reacondicionado">Reacondicionado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Grado</Label>
                      <Input value={editForm.grade} onChange={(e) => setEditForm({...editForm, grade: e.target.value})} placeholder="A+, A, B..." />
                    </div>
                    <div>
                      <Label className="text-xs">Batería %</Label>
                      <Input type="number" min="0" max="100" value={editForm.battery_health} onChange={(e) => setEditForm({...editForm, battery_health: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Costo</Label>
                      <Input type="number" min="0" step="0.01" value={editForm.purchase_cost} onChange={(e) => setEditForm({...editForm, purchase_cost: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Precio Venta</Label>
                      <Input type="number" min="0" step="0.01" value={editForm.sale_price} onChange={(e) => setEditForm({...editForm, sale_price: e.target.value})} />
                    </div>
                    <div>
                      <Label className="text-xs">Precio Mínimo</Label>
                      <Input type="number" min="0" step="0.01" value={editForm.min_price} onChange={(e) => setEditForm({...editForm, min_price: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Cantidad</Label>
                      <Input type="number" min="1" value={editForm.quantity} onChange={(e) => setEditForm({...editForm, quantity: e.target.value})} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <input type="checkbox" id="edit-is-new" checked={editForm.is_new} onChange={(e) => setEditForm({...editForm, is_new: e.target.checked})} className="h-4 w-4 rounded border-input" />
                      <Label htmlFor="edit-is-new" className="text-xs cursor-pointer">Equipo Nuevo</Label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Notas</Label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} rows={2} placeholder="Notas adicionales..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
                  <Button onClick={handleSaveEdit} disabled={savingEdit || !editForm.brand || !editForm.model}>
                    {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Restock dialog */}
        <Dialog open={!!restockItem} onOpenChange={(open) => !open && setRestockItem(null)}>
          <DialogContent className="max-w-sm">
            {restockItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base flex items-center gap-2">
                    <PackagePlus className="h-5 w-5 text-primary" />
                    Reabastecer Stock
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{restockItem.product?.brand} {restockItem.product?.name}</p>
                    <p className="text-xs text-muted-foreground">{restockItem.product?.color} · Precio: {formatCurrency(restockItem.sale_price)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Stock actual: <strong className="text-foreground">{restockItem.quantity}</strong></p>
                  </div>
                  <div>
                    <Label>Cantidad a agregar</Label>
                    <Input
                      type="number"
                      min="1"
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      placeholder="Ej: 10"
                      autoFocus
                    />
                  </div>
                  {restockQty && parseInt(restockQty) > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nuevo stock: <strong className="text-foreground">{(restockItem.quantity || 1) + parseInt(restockQty)}</strong>
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRestockItem(null)}>Cancelar</Button>
                  <Button onClick={handleRestock} disabled={restocking || !restockQty || parseInt(restockQty) <= 0}>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    {restocking ? 'Guardando...' : 'Agregar Stock'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Add inventory dialog */}
        {tenantId && <AddInventoryDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} tenantId={tenantId} />}
        {tenantId && <BatchInventoryDialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen} tenantId={tenantId} />}
      </div>
    </Layout>
  );
}
