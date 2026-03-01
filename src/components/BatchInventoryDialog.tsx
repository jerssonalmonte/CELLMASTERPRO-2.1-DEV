import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Check, Smartphone, Headphones, Wrench, Camera } from 'lucide-react';
import { startSafeScanner } from '@/lib/safeScanner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/currency';
import {
  DEVICE_CATALOG, CATALOG_BRANDS, ACCESSORY_CATEGORIES, SPARE_PART_CATEGORIES, findCatalogDevice,
} from '@/data/deviceCatalog';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { ProductCategory } from '@/types';

const db = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
}

/* ── Batch row type ─────────────────────────────── */
interface BatchRow {
  id: string;
  imei: string;
  grade: string;
  batteryHealth: string;
  color: string;
  capacity: string;
  purchaseCost: string;
  salePrice: string;
  notes: string;
  quantity: string;
}

const newBatchRow = (copyFrom?: BatchRow): BatchRow => ({
  id: crypto.randomUUID().slice(0, 8),
  imei: '',
  grade: copyFrom?.grade ?? '',
  batteryHealth: '',
  color: copyFrom?.color ?? '',
  capacity: copyFrom?.capacity ?? '',
  purchaseCost: copyFrom?.purchaseCost ?? '',
  salePrice: copyFrom?.salePrice ?? '',
  notes: '',
  quantity: '1',
});

/* ── Brand / Model input with manual fallback ───── */
function BrandSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);

  if (custom) {
    return (
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribir marca"
          autoFocus
          className="flex-1"
        />
        <Button size="sm" variant="ghost" onClick={() => { setCustom(false); onChange(''); }}>✕</Button>
      </div>
    );
  }

  return (
    <Select
      value={CATALOG_BRANDS.includes(value) ? value : ''}
      onValueChange={(v) => {
        if (v === '__custom__') { setCustom(true); onChange(''); }
        else onChange(v);
      }}
    >
      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
      <SelectContent>
        {CATALOG_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        <SelectItem value="__custom__">+ Agregar otra marca</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ModelSelect({ brand, value, onChange }: { brand: string; value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(false);
  const models = useMemo(() => {
    if (!brand) return [];
    return DEVICE_CATALOG.filter((d) => d.brand === brand).map((d) => d.model);
  }, [brand]);

  return models.length > 0 && !custom ? (
    <Select
      value={models.includes(value) ? value : ''}
      onValueChange={(v) => {
        if (v === '__custom__') { setCustom(true); onChange(''); }
        else onChange(v);
      }}
    >
      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
      <SelectContent>
        {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        <SelectItem value="__custom__">+ Otro modelo</SelectItem>
      </SelectContent>
    </Select>
  ) : (
    <div className="flex gap-1">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Escribir modelo" className="flex-1" autoFocus />
      {models.length > 0 && <Button size="sm" variant="ghost" onClick={() => { setCustom(false); onChange(''); }}>✕</Button>}
    </div>
  );
}

export function BatchInventoryDialog({ open, onOpenChange, tenantId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Category
  const [category, setCategory] = useState<ProductCategory>('celular');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('usado');
  const [isNew, setIsNew] = useState(false);

  // Spare part specific
  const [spareCategory, setSpareCategory] = useState('');
  const [customSpareCategories] = useLocalStorage<string[]>('custom_spare_categories', []);
  const allSpareCategories = useMemo(() => [...SPARE_PART_CATEGORIES.filter(c => c !== 'Otro'), ...customSpareCategories, 'Otro'], [customSpareCategories]);

  const [batchItems, setBatchItems] = useState<BatchRow[]>([newBatchRow()]);
  const imeiRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showImeiScanner, setShowImeiScanner] = useState(false);
  const [scanRowId, setScanRowId] = useState<string | null>(null);

  const catalogDevice = useMemo(() => findCatalogDevice(brand, model), [brand, model]);
  const isAcc = category === 'accesorio';
  const isSpare = category === 'repuesto';
  const isDevice = category === 'celular';

  const addBatchRow = (copyFromIndex?: number) => {
    const source = copyFromIndex !== undefined ? batchItems[copyFromIndex] : batchItems[batchItems.length - 1];
    const row = newBatchRow(source);
    setBatchItems((prev) => [...prev, row]);
    setTimeout(() => imeiRefs.current[row.id]?.focus(), 50);
  };

  const removeBatchRow = (id: string) => {
    setBatchItems((prev) => prev.filter((r) => r.id !== id));
  };

  const updateBatchRow = (id: string, field: keyof BatchRow, value: string) => {
    setBatchItems((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleBatchKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey && rowIndex === batchItems.length - 1)) {
      if (e.key === 'Enter') e.preventDefault();
      if (e.key === 'Tab') e.preventDefault();
      addBatchRow(rowIndex);
    }
  };

  const validBatch = isDevice
    ? batchItems.filter((r) => r.imei.trim())
    : batchItems.filter((r) => r.purchaseCost && r.salePrice);
  const batchTotalCost = validBatch.reduce((s, r) => s + (parseFloat(r.purchaseCost) || 0), 0);
  const batchTotalSale = validBatch.reduce((s, r) => s + (parseFloat(r.salePrice) || 0), 0);
  const batchTotalProfit = batchTotalSale - batchTotalCost;

  const handleSubmit = async () => {
    if (!brand || !model) {
      toast.error('Completa marca y modelo/nombre');
      return;
    }
    if (isSpare && !spareCategory) {
      toast.error('Selecciona una categoría de repuesto');
      return;
    }
    if (validBatch.length === 0) {
      toast.error(isDevice ? 'Ingresa al menos un IMEI' : 'Ingresa al menos un artículo con precios');
      return;
    }
    const missingPrices = validBatch.some((r) => !r.purchaseCost || !r.salePrice);
    if (missingPrices) {
      toast.error('Cada artículo debe tener precio de compra y venta');
      return;
    }

    setSaving(true);
    try {
      const productName = isSpare ? `${spareCategory} - ${model}` : model;
      const catStr = category;

      for (const row of validBatch) {
        const colorVal = row.color || '';
        const { data: existingProduct } = await db.from('products').select('id')
          .eq('tenant_id', tenantId).eq('brand', brand).eq('name', productName)
          .eq('color', colorVal).eq('category', catStr).maybeSingle();

        let productId: string;
        if (existingProduct) {
          productId = existingProduct.id;

          if (!isDevice) {
            const { data: existingInv } = await db.from('inventory_items').select('id, quantity')
              .eq('product_id', existingProduct.id).eq('tenant_id', tenantId)
              .eq('status', 'disponible').eq('purchase_cost', parseFloat(row.purchaseCost))
              .eq('sale_price', parseFloat(row.salePrice)).maybeSingle();
            if (existingInv) {
              const newQty = (existingInv.quantity || 1) + (parseInt(row.quantity) || 1);
              await db.from('inventory_items').update({ quantity: newQty }).eq('id', existingInv.id);
              continue;
            }
          }
        } else {
          const { data: newProduct, error: pErr } = await db.from('products').insert({
            tenant_id: tenantId, name: productName, brand, color: colorVal,
            capacity: row.capacity || null, category: catStr, base_price: parseFloat(row.salePrice),
          }).select('id').single();
          if (pErr) throw pErr;
          productId = newProduct.id;
        }

        await db.from('inventory_items').insert({
          tenant_id: tenantId, product_id: productId,
          imei: row.imei || null, condition: isDevice ? condition : 'nuevo',
          grade: row.grade || null,
          battery_health: row.batteryHealth ? parseInt(row.batteryHealth) : null,
          is_new: isNew, purchase_cost: parseFloat(row.purchaseCost),
          sale_price: parseFloat(row.salePrice),
          quantity: isDevice ? 1 : (parseInt(row.quantity) || 1),
          status: 'disponible', notes: row.notes || null,
        });
      }

      toast.success(`${validBatch.length} artículos ingresados al inventario`);
      setBatchItems([newBatchRow()]);
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['inventory', tenantId] });
      qc.invalidateQueries({ queryKey: ['products', tenantId] });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Agregar Inventario por Lote
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresa múltiples artículos del mismo tipo. Presiona <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> o <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Tab</kbd> en la última fila para agregar otra.
            </p>
          </DialogHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {/* Category selector */}
            <div className="flex gap-2 flex-wrap">
              <Button variant={isDevice ? 'default' : 'outline'} size="sm" onClick={() => { setCategory('celular'); setBrand(''); setModel(''); }}>
                <Smartphone className="h-3.5 w-3.5 mr-1" /> Equipos
              </Button>
              <Button variant={isAcc ? 'default' : 'outline'} size="sm" onClick={() => { setCategory('accesorio'); setBrand(''); setModel(''); }}>
                <Headphones className="h-3.5 w-3.5 mr-1" /> Productos
              </Button>
              <Button variant={isSpare ? 'default' : 'outline'} size="sm" onClick={() => { setCategory('repuesto'); setBrand(''); setModel(''); }}>
                <Wrench className="h-3.5 w-3.5 mr-1" /> Repuestos
              </Button>
            </div>

            {/* Common fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {isSpare && (
                <div>
                  <Label className="text-xs font-medium mb-1 block">Categoría *</Label>
                  <Select value={spareCategory} onValueChange={setSpareCategory}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {allSpareCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs font-medium mb-1 block">Marca *</Label>
                {isDevice ? (
                  <BrandSelect value={brand} onChange={(v) => { setBrand(v); setModel(''); }} />
                ) : (
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ej: Samsung, OEM..." className="h-9" />
                )}
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block">{isSpare ? 'Nombre *' : isAcc ? 'Tipo *' : 'Modelo *'}</Label>
                {isDevice ? (
                  <ModelSelect brand={brand} value={model} onChange={setModel} />
                ) : isAcc ? (
                  <Select value={ACCESSORY_CATEGORIES.includes(model) ? model : ''} onValueChange={setModel}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {ACCESSORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ej: Pantalla iPhone 13" className="h-9" />
                )}
              </div>
              {/* Capacity moved to per-line in the batch table */}
              {isDevice && (
                <div>
                  <Label className="text-xs font-medium mb-1 block">Condición</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="usado">Usado</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch checked={isNew} onCheckedChange={setIsNew} />
                  <Label className="text-xs">Nuevos</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Batch rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Artículos ({batchItems.length})</h3>
                <Button size="sm" variant="outline" onClick={() => addBatchRow()}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Agregar fila
                </Button>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs w-10 text-center">#</TableHead>
                      {isDevice && <TableHead className="text-xs">IMEI</TableHead>}
                      <TableHead className="text-xs">Color</TableHead>
                      {isDevice && <TableHead className="text-xs">Capacidad</TableHead>}
                      {isDevice && <TableHead className="text-xs w-[70px]">Grado</TableHead>}
                      {isDevice && <TableHead className="text-xs w-24">Bat %</TableHead>}
                      {!isDevice && <TableHead className="text-xs w-[70px]">Cant.</TableHead>}
                      <TableHead className="text-xs">Compra</TableHead>
                      <TableHead className="text-xs">Venta</TableHead>
                      <TableHead className="text-xs">Ganancia</TableHead>
                      <TableHead className="text-xs">Nota</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchItems.map((row, i) => {
                      const profit = (parseFloat(row.salePrice) || 0) - (parseFloat(row.purchaseCost) || 0);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                          {isDevice && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Input
                                  ref={(el) => { imeiRefs.current[row.id] = el; }}
                                  value={row.imei}
                                  onChange={(e) => updateBatchRow(row.id, 'imei', e.target.value)}
                                  placeholder="IMEI"
                                  className="h-8 text-xs"
                                />
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setScanRowId(row.id); setShowImeiScanner(true); }}>
                                  <Camera className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            {isDevice && catalogDevice?.colors ? (
                              <Select value={row.color} onValueChange={(v) => updateBatchRow(row.id, 'color', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                <SelectContent>{catalogDevice.colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <Input value={row.color} onChange={(e) => updateBatchRow(row.id, 'color', e.target.value)} placeholder="Color" className="h-8 text-xs" />
                            )}
                          </TableCell>
                          {isDevice && (
                            <TableCell>
                              {catalogDevice?.storages ? (
                                <Select value={row.capacity} onValueChange={(v) => updateBatchRow(row.id, 'capacity', v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                                  <SelectContent>{catalogDevice.storages.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <Input value={row.capacity} onChange={(e) => updateBatchRow(row.id, 'capacity', e.target.value)} placeholder="GB" className="h-8 text-xs" />
                              )}
                            </TableCell>
                          )}
                          {isDevice && (
                            <TableCell>
                              <Input value={row.grade} onChange={(e) => updateBatchRow(row.id, 'grade', e.target.value)} placeholder="A+" className="h-8 text-xs" />
                            </TableCell>
                          )}
                          {isDevice && (
                            <TableCell>
                              <Input type="number" value={row.batteryHealth} onChange={(e) => updateBatchRow(row.id, 'batteryHealth', e.target.value)} placeholder="%" className="h-8 text-xs w-full min-w-[60px]" />
                            </TableCell>
                          )}
                          {!isDevice && (
                            <TableCell>
                              <Input type="number" min="1" value={row.quantity} onChange={(e) => updateBatchRow(row.id, 'quantity', e.target.value)} placeholder="1" className="h-8 text-xs" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Input
                              ref={!isDevice ? (el) => { imeiRefs.current[row.id] = el; } : undefined}
                              type="number" value={row.purchaseCost} onChange={(e) => updateBatchRow(row.id, 'purchaseCost', e.target.value)} placeholder="$" className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={row.salePrice} onChange={(e) => updateBatchRow(row.id, 'salePrice', e.target.value)} onKeyDown={(e) => handleBatchKeyDown(e, i)} placeholder="$" className="h-8 text-xs" />
                          </TableCell>
                          <TableCell className={`text-xs font-semibold whitespace-nowrap ${profit > 0 ? 'text-green-500' : profit < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {row.purchaseCost && row.salePrice ? formatCurrency(profit) : '—'}
                          </TableCell>
                          <TableCell>
                            <Input value={row.notes} onChange={(e) => updateBatchRow(row.id, 'notes', e.target.value)} onKeyDown={(e) => handleBatchKeyDown(e, i)} placeholder="Nota" className="h-8 text-xs" />
                          </TableCell>
                          <TableCell className="text-center">
                            {batchItems.length > 1 && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeBatchRow(row.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Fixed footer */}
          <div className="shrink-0 border-t px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-background">
            {validBatch.length > 0 ? (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground">{validBatch.length} artículo{validBatch.length !== 1 ? 's' : ''}</span>
                <span>Costo: <strong>{formatCurrency(batchTotalCost)}</strong></span>
                <span>Ganancia: <strong className={batchTotalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCurrency(batchTotalProfit)}</strong></span>
              </div>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                <Check className="mr-2 h-4 w-4" />
                {saving ? 'Guardando...' : `Ingresar ${validBatch.length} artículos`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* IMEI Camera Scanner */}
      <Dialog open={showImeiScanner} onOpenChange={setShowImeiScanner}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Escanear IMEI
            </DialogTitle>
          </DialogHeader>
          <BatchImeiScanner
            active={showImeiScanner}
            onScan={(code) => {
              if (scanRowId) updateBatchRow(scanRowId, 'imei', code);
              setShowImeiScanner(false);
            }}
          />
          <Button variant="outline" onClick={() => setShowImeiScanner(false)}>Cerrar</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BatchImeiScanner({ active, onScan }: { active: boolean; onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;
    const { cleanup } = startSafeScanner(
      'batch-imei-scanner',
      (code) => onScanRef.current(code)
    );
    return cleanup;
  }, [active]);

  return <div id="batch-imei-scanner" className="w-full rounded-lg overflow-hidden" />;
}
