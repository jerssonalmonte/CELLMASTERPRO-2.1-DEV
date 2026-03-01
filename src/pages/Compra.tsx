import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { CustomerAutocomplete } from '@/components/CustomerAutocomplete';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeftRight, Plus, Trash2, Check, User, Camera } from 'lucide-react';
import { startSafeScanner } from '@/lib/safeScanner';
import {
  Dialog as ScanDialog, DialogContent as ScanDialogContent, DialogHeader as ScanDialogHeader, DialogTitle as ScanDialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CATALOG_BRANDS, DEVICE_CATALOG, findCatalogDevice, ACCESSORY_CATEGORIES } from '@/data/deviceCatalog';
import type { ProductCategory } from '@/types';

/* ── Batch row type ─────────────────────────────── */
interface BatchRow {
  id: string;
  imei: string;
  grade: string;
  batteryHealth: string;
  color: string;
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
  purchaseCost: copyFrom?.purchaseCost ?? '',
  salePrice: copyFrom?.salePrice ?? '',
  notes: '',
  quantity: '1',
});

/* ── Single item type ───────────────────────────── */
interface PurchaseItem {
  id: string;
  category: ProductCategory;
  brand: string;
  model: string;
  imei: string;
  color: string;
  capacity: string;
  condition: string;
  grade: string;
  batteryHealth: string;
  isNew: boolean;
  purchaseCost: string;
  salePrice: string;
  quantity: string;
}

const emptyItem = (): PurchaseItem => ({
  id: crypto.randomUUID().slice(0, 8),
  category: 'celular',
  brand: '', model: '', imei: '', color: '', capacity: '',
  condition: 'bueno', grade: '', batteryHealth: '', isNew: false,
  purchaseCost: '', salePrice: '', quantity: '1',
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

  useEffect(() => { setCustom(false); }, [brand]);

  if (custom || models.length === 0) {
    return (
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribir modelo"
          autoFocus
          className="flex-1"
        />
        {models.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => { setCustom(false); onChange(''); }}>✕</Button>
        )}
      </div>
    );
  }

  return (
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
        <SelectItem value="__custom__">+ Agregar otro modelo</SelectItem>
      </SelectContent>
    </Select>
  );
}

/* ════════════════════════════════════════════════ */
export default function Compra() {
  const { createPurchase, customers, upsertCustomer } = useStore();
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Supplier
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierCedula, setSupplierCedula] = useState('');
  const [notes, setNotes] = useState('');

  // Single mode
  const [single, setSingle] = useState<PurchaseItem>(emptyItem());
  const [showImeiScanner, setShowImeiScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState<{ type: 'single' } | { type: 'batch'; rowId: string }>({ type: 'single' });

  // Batch mode
  const [batchCategory, setBatchCategory] = useState<ProductCategory>('celular');
  const [batchBrand, setBatchBrand] = useState('');
  const [batchModel, setBatchModel] = useState('');
  const [batchCapacity, setBatchCapacity] = useState('');
  const [batchCondition, setBatchCondition] = useState('bueno');
  const [batchIsNew, setBatchIsNew] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchRow[]>([newBatchRow()]);

  // Ref map for focusing new rows
  const imeiRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Catalog helpers
  const singleDevice = useMemo(() => findCatalogDevice(single.brand, single.model), [single.brand, single.model]);
  const batchDevice = useMemo(() => findCatalogDevice(batchBrand, batchModel), [batchBrand, batchModel]);

  const isAccessory = single.category === 'accesorio';
  const isBatchAccessory = batchCategory === 'accesorio';

  /* ── Batch helpers ──────────────────────────── */
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

  /* ── Submit single ─────────────────────────── */
  const handleSubmitSingle = () => {
    if (!supplierName || !single.brand || !single.model || !single.purchaseCost || !single.salePrice) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    const qty = Math.max(1, parseInt(single.quantity) || 1);
    const items = [];
    for (let i = 0; i < qty; i++) {
      items.push({
        category: single.category as ProductCategory,
        brand: single.brand, model: single.model, imei: qty === 1 ? single.imei : undefined,
        color: single.color, capacity: single.capacity, condition: single.condition, grade: single.grade,
        batteryHealth: single.batteryHealth ? parseInt(single.batteryHealth) : undefined,
        isNew: single.isNew, purchaseCost: parseFloat(single.purchaseCost), salePrice: parseFloat(single.salePrice),
      });
    }
    createPurchase({ supplierName, supplierPhone, supplierCedula, notes, items });
    upsertCustomer(supplierName, supplierPhone, supplierCedula);
    toast.success(qty > 1 ? `${qty} artículos ingresados al inventario` : 'Artículo ingresado al inventario');
    setSingle(emptyItem());
    setNotes('');
  };

  /* ── Submit batch ──────────────────────────── */
  const handleSubmitBatch = () => {
    if (!supplierName || !batchBrand || !batchModel) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    const validItems = isBatchAccessory
      ? batchItems.filter((r) => r.purchaseCost && r.salePrice)
      : batchItems.filter((r) => r.imei.trim());
    if (validItems.length === 0) {
      toast.error(isBatchAccessory ? 'Ingresa al menos un artículo con precios' : 'Ingresa al menos un IMEI');
      return;
    }
    const missingPrices = validItems.some((r) => !r.purchaseCost || !r.salePrice);
    if (missingPrices) {
      toast.error('Cada artículo debe tener precio de compra y venta');
      return;
    }
    createPurchase({
      supplierName, supplierPhone, supplierCedula, notes,
      items: validItems.map((r) => ({
        category: batchCategory,
        brand: batchBrand, model: batchModel, imei: r.imei || undefined, color: r.color,
        capacity: batchCapacity, condition: batchCondition, grade: r.grade,
        batteryHealth: r.batteryHealth ? parseInt(r.batteryHealth) : undefined,
        isNew: batchIsNew,
        purchaseCost: parseFloat(r.purchaseCost),
        salePrice: parseFloat(r.salePrice),
      })),
    });
    upsertCustomer(supplierName, supplierPhone, supplierCedula);
    toast.success(`${validItems.length} artículos ingresados al inventario`);
    setBatchItems([newBatchRow()]);
    setNotes('');
  };

  /* ── Batch summary ─────────────────────────── */
  const validBatch = isBatchAccessory
    ? batchItems.filter((r) => r.purchaseCost && r.salePrice)
    : batchItems.filter((r) => r.imei.trim());
  const batchTotalCost = validBatch.reduce((s, r) => s + (parseFloat(r.purchaseCost) || 0), 0);
  const batchTotalSale = validBatch.reduce((s, r) => s + (parseFloat(r.salePrice) || 0), 0);
  const batchTotalProfit = batchTotalSale - batchTotalCost;

  return (
    <Layout>
      <div className="page-container max-w-5xl mx-auto">
        <div className="section-header">
          <h1 className="page-title">Trade-In / Recepción de Equipos</h1>
        </div>

        {/* Seller / Customer */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Persona que vende</h3>
            <CustomerAutocomplete
              customers={customers}
              customerName={supplierName}
              customerPhone={supplierPhone}
              customerCedula={supplierCedula}
              onSelectCustomer={(c) => {
                setSupplierName(c.full_name);
                setSupplierPhone(c.phone || '');
                setSupplierCedula(c.cedula || '');
              }}
              onNameChange={setSupplierName}
              onPhoneChange={setSupplierPhone}
              onCedulaChange={setSupplierCedula}
            />
          </CardContent>
        </Card>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'batch')}>
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">Individual</TabsTrigger>
            <TabsTrigger value="batch" className="flex-1">Lote (Batch)</TabsTrigger>
          </TabsList>

          {/* ══ Single mode ══ */}
          <TabsContent value="single">
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Category selector */}
                <div className="flex gap-2">
                  <Button
                    variant={single.category === 'celular' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSingle((s) => ({ ...s, category: 'celular' }))}
                  >
                    📱 Celular
                  </Button>
                  <Button
                    variant={single.category === 'accesorio' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSingle((s) => ({ ...s, category: 'accesorio', imei: '', batteryHealth: '', grade: '', capacity: '' }))}
                  >
                    🎧 Producto
                  </Button>
                </div>

                <div className="form-grid">
                  {isAccessory ? (
                    <>
                      <div>
                        <Label>Marca *</Label>
                        <Input value={single.brand} onChange={(e) => setSingle((s) => ({ ...s, brand: e.target.value }))} placeholder="Ej: Samsung, Spigen, Anker..." />
                      </div>
                      <div>
                        <Label>Tipo / Modelo *</Label>
                        <Select value={ACCESSORY_CATEGORIES.includes(single.model) ? single.model : ''} onValueChange={(v) => setSingle((s) => ({ ...s, model: v }))}>
                          <SelectTrigger><SelectValue placeholder="Tipo de producto" /></SelectTrigger>
                          <SelectContent>
                            {ACCESSORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Color</Label><Input value={single.color} onChange={(e) => setSingle((s) => ({ ...s, color: e.target.value }))} /></div>
                      <div><Label>Cantidad</Label><Input type="number" min="1" value={single.quantity} onChange={(e) => setSingle((s) => ({ ...s, quantity: e.target.value }))} /></div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Marca *</Label>
                        <BrandSelect value={single.brand} onChange={(v) => setSingle((s) => ({ ...s, brand: v, model: '', color: '', capacity: '' }))} />
                      </div>
                      <div>
                        <Label>Modelo *</Label>
                        <ModelSelect brand={single.brand} value={single.model} onChange={(v) => setSingle((s) => ({ ...s, model: v }))} />
                      </div>
                      <div>
                        <Label>Color</Label>
                        {singleDevice?.colors ? (
                          <Select value={single.color} onValueChange={(v) => setSingle((s) => ({ ...s, color: v }))}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>{singleDevice.colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input value={single.color} onChange={(e) => setSingle((s) => ({ ...s, color: e.target.value }))} />
                        )}
                      </div>
                      <div>
                        <Label>Almacenamiento</Label>
                        {singleDevice?.storages ? (
                          <Select value={single.capacity} onValueChange={(v) => setSingle((s) => ({ ...s, capacity: v }))}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent>{singleDevice.storages.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input value={single.capacity} onChange={(e) => setSingle((s) => ({ ...s, capacity: e.target.value }))} />
                        )}
                      </div>
                      <div>
                        <Label>IMEI</Label>
                        <div className="flex gap-2">
                          <Input value={single.imei} onChange={(e) => setSingle((s) => ({ ...s, imei: e.target.value }))} className="flex-1" placeholder="Escanear o escribir" />
                          <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => { setScanTarget({ type: 'single' }); setShowImeiScanner(true); }}>
                            <Camera className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Condición</Label>
                        <Select value={single.condition} onValueChange={(v) => setSingle((s) => ({ ...s, condition: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excelente">Excelente</SelectItem>
                            <SelectItem value="bueno">Bueno</SelectItem>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="malo">Malo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Grado</Label><Input value={single.grade} onChange={(e) => setSingle((s) => ({ ...s, grade: e.target.value }))} placeholder="A+, A, B+, B..." /></div>
                      <div><Label>Batería %</Label><Input type="number" value={single.batteryHealth} onChange={(e) => setSingle((s) => ({ ...s, batteryHealth: e.target.value }))} placeholder="85" /></div>
                    </>
                  )}
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={single.isNew} onCheckedChange={(v) => setSingle((s) => ({ ...s, isNew: v }))} />
                    <Label>Nuevo</Label>
                  </div>
                </div>
                <Separator />
                <div className="form-grid">
                  <div><Label>Precio Compra (RD$) *</Label><Input type="number" value={single.purchaseCost} onChange={(e) => setSingle((s) => ({ ...s, purchaseCost: e.target.value }))} /></div>
                  <div><Label>Precio Venta (RD$) *</Label><Input type="number" value={single.salePrice} onChange={(e) => setSingle((s) => ({ ...s, salePrice: e.target.value }))} /></div>
                </div>
                {single.purchaseCost && single.salePrice && (
                  <div className="text-sm text-muted-foreground">
                    Ganancia: <strong className="text-foreground">{formatCurrency((parseFloat(single.salePrice) || 0) - (parseFloat(single.purchaseCost) || 0))}</strong>
                    {isAccessory && parseInt(single.quantity) > 1 && (
                      <span className="ml-2">
                        (x{single.quantity} = <strong>{formatCurrency(((parseFloat(single.salePrice) || 0) - (parseFloat(single.purchaseCost) || 0)) * parseInt(single.quantity))}</strong>)
                      </span>
                    )}
                  </div>
                )}
                <div><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
                <Button className="w-full" onClick={handleSubmitSingle}>
                  <Check className="mr-2 h-4 w-4" /> Registrar Trade-In
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ Batch mode ══ */}
          <TabsContent value="batch">
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Category selector for batch */}
                <div className="flex gap-2">
                  <Button
                    variant={batchCategory === 'celular' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBatchCategory('celular')}
                  >
                    📱 Celulares
                  </Button>
                  <Button
                    variant={batchCategory === 'accesorio' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBatchCategory('accesorio')}
                  >
                    🎧 Productos
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ingresa múltiples {isBatchAccessory ? 'productos' : 'equipos'} del mismo tipo. Presiona <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> o <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Tab</kbd> en la última fila para agregar otra.
                </p>
                <div className="form-grid">
                  <div>
                    <Label>Marca *</Label>
                    {isBatchAccessory ? (
                      <Input value={batchBrand} onChange={(e) => setBatchBrand(e.target.value)} placeholder="Ej: Spigen, Anker..." />
                    ) : (
                      <BrandSelect value={batchBrand} onChange={(v) => { setBatchBrand(v); setBatchModel(''); setBatchCapacity(''); }} />
                    )}
                  </div>
                  <div>
                    <Label>{isBatchAccessory ? 'Tipo *' : 'Modelo *'}</Label>
                    {isBatchAccessory ? (
                      <Select value={ACCESSORY_CATEGORIES.includes(batchModel) ? batchModel : ''} onValueChange={setBatchModel}>
                        <SelectTrigger><SelectValue placeholder="Tipo de producto" /></SelectTrigger>
                        <SelectContent>
                          {ACCESSORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <ModelSelect brand={batchBrand} value={batchModel} onChange={setBatchModel} />
                    )}
                  </div>
                  {!isBatchAccessory && (
                    <div>
                      <Label>Almacenamiento</Label>
                      {batchDevice?.storages ? (
                        <Select value={batchCapacity} onValueChange={setBatchCapacity}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>{batchDevice.storages.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input value={batchCapacity} onChange={(e) => setBatchCapacity(e.target.value)} />
                      )}
                    </div>
                  )}
                  {!isBatchAccessory && (
                    <div>
                      <Label>Condición</Label>
                      <Select value={batchCondition} onValueChange={setBatchCondition}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excelente">Excelente</SelectItem>
                          <SelectItem value="bueno">Bueno</SelectItem>
                          <SelectItem value="regular">Regular</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={batchIsNew} onCheckedChange={setBatchIsNew} />
                    <Label>Nuevos</Label>
                  </div>
                </div>

                <Separator />

                {/* Batch rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Artículos ({batchItems.length})</h3>
                    <Button size="sm" variant="outline" onClick={() => addBatchRow()}><Plus className="mr-1 h-3.5 w-3.5" /> Agregar</Button>
                  </div>
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="text-xs w-8">#</TableHead>
                          {!isBatchAccessory && <TableHead className="text-xs">IMEI</TableHead>}
                          <TableHead className="text-xs">Color</TableHead>
                          {!isBatchAccessory && <TableHead className="text-xs">Grado</TableHead>}
                          {!isBatchAccessory && <TableHead className="text-xs w-20">Bat %</TableHead>}
                          <TableHead className="text-xs">Compra</TableHead>
                          <TableHead className="text-xs">Venta</TableHead>
                          <TableHead className="text-xs">Ganancia</TableHead>
                          <TableHead className="text-xs">Nota</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchItems.map((row, i) => {
                          const profit = (parseFloat(row.salePrice) || 0) - (parseFloat(row.purchaseCost) || 0);
                          return (
                            <TableRow key={row.id}>
                              <TableCell className="text-xs">{i + 1}</TableCell>
                              {!isBatchAccessory && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Input
                                      ref={(el) => { imeiRefs.current[row.id] = el; }}
                                      value={row.imei}
                                      onChange={(e) => updateBatchRow(row.id, 'imei', e.target.value)}
                                      placeholder="IMEI"
                                      className="h-8 text-xs min-w-[140px]"
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setScanTarget({ type: 'batch', rowId: row.id }); setShowImeiScanner(true); }}>
                                      <Camera className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                              <TableCell>
                                {!isBatchAccessory && batchDevice?.colors ? (
                                  <Select value={row.color} onValueChange={(v) => updateBatchRow(row.id, 'color', v)}>
                                    <SelectTrigger className="h-8 text-xs min-w-[90px]"><SelectValue placeholder="—" /></SelectTrigger>
                                    <SelectContent>{batchDevice.colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                  </Select>
                                ) : (
                                  <Input value={row.color} onChange={(e) => updateBatchRow(row.id, 'color', e.target.value)} placeholder="Color" className="h-8 text-xs w-20" />
                                )}
                              </TableCell>
                              {!isBatchAccessory && (
                                <TableCell>
                                  <Input value={row.grade} onChange={(e) => updateBatchRow(row.id, 'grade', e.target.value)} placeholder="A+" className="h-8 text-xs w-14" />
                                </TableCell>
                              )}
                              {!isBatchAccessory && (
                                <TableCell>
                                  <Input type="number" value={row.batteryHealth} onChange={(e) => updateBatchRow(row.id, 'batteryHealth', e.target.value)} placeholder="%" className="h-8 text-xs w-20" />
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  ref={isBatchAccessory ? (el) => { imeiRefs.current[row.id] = el; } : undefined}
                                  type="number" value={row.purchaseCost} onChange={(e) => updateBatchRow(row.id, 'purchaseCost', e.target.value)} placeholder="$" className="h-8 text-xs w-20"
                                />
                              </TableCell>
                              <TableCell>
                                <Input type="number" value={row.salePrice} onChange={(e) => updateBatchRow(row.id, 'salePrice', e.target.value)} onKeyDown={(e) => handleBatchKeyDown(e, i)} placeholder="$" className="h-8 text-xs w-20" />
                              </TableCell>
                              <TableCell className={`text-xs font-medium ${profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {row.purchaseCost && row.salePrice ? formatCurrency(profit) : '—'}
                              </TableCell>
                              <TableCell>
                                <Input value={row.notes} onChange={(e) => updateBatchRow(row.id, 'notes', e.target.value)} onKeyDown={(e) => handleBatchKeyDown(e, i)} placeholder="Nota" className="h-8 text-xs w-24" />
                              </TableCell>
                              <TableCell>
                                {batchItems.length > 1 && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeBatchRow(row.id)}>
                                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
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

                <div><Label>Notas generales</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>

                {validBatch.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 rounded-xl bg-muted p-3 text-sm">
                    <div>{validBatch.length} artículos</div>
                    <div>Costo total: <strong>{formatCurrency(batchTotalCost)}</strong></div>
                    <div>Ganancia total: <strong className={batchTotalProfit >= 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(batchTotalProfit)}</strong></div>
                  </div>
                )}

                <Button className="w-full" onClick={handleSubmitBatch}>
                  <Check className="mr-2 h-4 w-4" /> Registrar Lote Trade-In
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* IMEI Camera Scanner */}
        <ScanDialog open={showImeiScanner} onOpenChange={setShowImeiScanner}>
          <ScanDialogContent className="max-w-sm">
            <ScanDialogHeader>
              <ScanDialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" /> Escanear IMEI
              </ScanDialogTitle>
            </ScanDialogHeader>
            <CompraImeiScanner
              active={showImeiScanner}
              onScan={(code) => {
                if (scanTarget.type === 'single') {
                  setSingle((s) => ({ ...s, imei: code }));
                } else {
                  updateBatchRow(scanTarget.rowId, 'imei', code);
                }
                setShowImeiScanner(false);
              }}
            />
            <Button variant="outline" onClick={() => setShowImeiScanner(false)}>Cerrar</Button>
          </ScanDialogContent>
        </ScanDialog>
      </div>
    </Layout>
  );
}

function CompraImeiScanner({ active, onScan }: { active: boolean; onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;
    const { cleanup } = startSafeScanner(
      'compra-imei-scanner',
      (code) => onScanRef.current(code)
    );
    return cleanup;
  }, [active]);

  return <div id="compra-imei-scanner" className="w-full rounded-lg overflow-hidden" />;
}
