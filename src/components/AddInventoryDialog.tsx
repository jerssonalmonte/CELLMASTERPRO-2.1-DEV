import { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Headphones, Plus, Barcode, Wrench, Camera } from 'lucide-react';
import { startSafeScanner } from '@/lib/safeScanner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  DEVICE_CATALOG, CATALOG_BRANDS, ACCESSORY_CATEGORIES, SPARE_PART_CATEGORIES, findCatalogDevice,
} from '@/data/deviceCatalog';
import useLocalStorage from '@/hooks/useLocalStorage';

const db = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
}

const GRADES = ['A+', 'A', 'B+', 'B', 'C'];

function generateBarcode(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${timestamp}${random}`;
}

export function AddInventoryDialog({ open, onOpenChange, tenantId }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'celular' | 'accesorio' | 'repuesto'>('celular');
  const [saving, setSaving] = useState(false);

  // Custom spare part categories persisted in localStorage
  const [customSpareCategories, setCustomSpareCategories] = useLocalStorage<string[]>('custom_spare_categories', []);
  const allSpareCategories = useMemo(() => [...SPARE_PART_CATEGORIES.filter(c => c !== 'Otro'), ...customSpareCategories, 'Otro'], [customSpareCategories]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Device fields
  const [brand, setBrand] = useState('');
  const [customBrand, setCustomBrand] = useState(false);
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState(false);
  const [color, setColor] = useState('');
  const [customColor, setCustomColor] = useState(false);
  const [capacity, setCapacity] = useState('');
  const [imei, setImei] = useState('');
  const [deviceBarcode, setDeviceBarcode] = useState('');
  const [condition, setCondition] = useState('usado');
  const [grade, setGrade] = useState('');
  const [batteryHealth, setBatteryHealth] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [purchaseCost, setPurchaseCost] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [showImeiScanner, setShowImeiScanner] = useState(false);

  // Accessory fields
  const [accName, setAccName] = useState('');
  const [accSku, setAccSku] = useState('');
  const [accBarcode, setAccBarcode] = useState('');
  const [accCategory, setAccCategory] = useState('');
  const [accBrand, setAccBrand] = useState('');
  const [accColor, setAccColor] = useState('');
  const [accQuantity, setAccQuantity] = useState('1');
  const [accCost, setAccCost] = useState('');
  const [accPrice, setAccPrice] = useState('');
  const [accMinPrice, setAccMinPrice] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // Spare part fields
  const [spCategory, setSpCategory] = useState('');
  const [spName, setSpName] = useState('');
  const [spBrand, setSpBrand] = useState('');
  const [spSku, setSpSku] = useState('');
  const [spBarcode, setSpBarcode] = useState('');
  const [spQuantity, setSpQuantity] = useState('1');
  const [spCost, setSpCost] = useState('');
  const [spPrice, setSpPrice] = useState('');
  const [spMinPrice, setSpMinPrice] = useState('');
  const [spNotes, setSpNotes] = useState('');

  const models = useMemo(() => {
    if (!brand) return [];
    return DEVICE_CATALOG.filter((d) => d.brand === brand).map((d) => d.model);
  }, [brand]);

  const catalogDevice = useMemo(() => findCatalogDevice(brand, model), [brand, model]);
  const colors = catalogDevice?.colors || [];
  const storages = catalogDevice?.storages || [];

  const resetForm = () => {
    setBrand(''); setCustomBrand(false); setModel(''); setCustomModel(false); setColor(''); setCustomColor(false); setCapacity(''); setImei(''); setDeviceBarcode('');
    setCondition('usado'); setGrade(''); setBatteryHealth(''); setIsNew(false);
    setPurchaseCost(''); setSalePrice(''); setMinPrice(''); setNotes(''); setShowImeiScanner(false);
    setAccName(''); setAccSku(''); setAccBarcode(''); setAccCategory(''); setAccBrand(''); setAccColor('');
    setAccQuantity('1'); setAccCost(''); setAccPrice(''); setAccMinPrice(''); setAccNotes('');
    setSpCategory(''); setSpName(''); setSpBrand(''); setSpSku(''); setSpBarcode('');
    setSpQuantity('1'); setSpCost(''); setSpPrice(''); setSpMinPrice(''); setSpNotes('');
    setAddingCategory(false); setNewCategoryName('');
  };

  const handleAddCustomCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (allSpareCategories.includes(name)) {
      toast.error('Esa categoría ya existe');
      return;
    }
    setCustomSpareCategories([...customSpareCategories, name]);
    setSpCategory(name);
    setAddingCategory(false);
    setNewCategoryName('');
    toast.success(`Categoría "${name}" agregada`);
  };

  const handleSaveDevice = async () => {
    if (!brand || !model || !color) {
      toast.error('Completa marca, modelo y color');
      return;
    }
    const cost = parseFloat(purchaseCost) || 0;
    const price = parseFloat(salePrice) || 0;
    if (price <= 0) { toast.error('Ingresa un precio de venta válido'); return; }

    setSaving(true);
    try {
      const productName = model;
      const { data: existingProducts } = await db.from('products').select('id')
        .eq('tenant_id', tenantId).eq('brand', brand).eq('name', productName)
        .eq('color', color).eq('capacity', capacity || '').eq('category', 'celular');

      let productId: string;
      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].id;
      } else {
        const { data: newProduct, error: pErr } = await db.from('products').insert({
          tenant_id: tenantId, name: productName, brand, color,
          capacity: capacity || null, category: 'celular', base_price: price,
        }).select('id').single();
        if (pErr) throw pErr;
        productId = newProduct.id;
      }

      const minP = parseFloat(minPrice) || 0;
      const barcodeVal = deviceBarcode || generateBarcode();
      const { error } = await db.from('inventory_items').insert({
        tenant_id: tenantId, product_id: productId,
        imei: imei || null, barcode: barcodeVal, condition, grade: grade || null,
        battery_health: batteryHealth ? parseInt(batteryHealth) : null,
        is_new: isNew, purchase_cost: cost, sale_price: price,
        min_price: minP, quantity: 1, status: 'disponible', notes: notes || null,
      });
      if (error) throw error;

      toast.success('Equipo agregado al inventario');
      resetForm();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['inventory', tenantId] });
      qc.invalidateQueries({ queryKey: ['products', tenantId] });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccessory = async () => {
    if (!accName) { toast.error('Ingresa el nombre del producto'); return; }
    const cost = parseFloat(accCost) || 0;
    const price = parseFloat(accPrice) || 0;
    const qty = parseInt(accQuantity) || 1;
    if (price <= 0) { toast.error('Ingresa un precio de venta válido'); return; }

    setSaving(true);
    try {
      const brandVal = accBrand || 'Genérico';
      const colorVal = accColor || 'N/A';

      const { data: existingProducts } = await db.from('products').select('id')
        .eq('tenant_id', tenantId).eq('brand', brandVal).eq('name', accName)
        .eq('color', colorVal).eq('category', 'accesorio');

      let productId: string;
      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].id;
      } else {
        const { data: newProduct, error: pErr } = await db.from('products').insert({
          tenant_id: tenantId, name: accName, brand: brandVal,
          color: colorVal, category: 'accesorio', base_price: price,
        }).select('id').single();
        if (pErr) throw pErr;
        productId = newProduct.id;
      }

      const minP = parseFloat(accMinPrice) || 0;
      const barcodeVal = accBarcode || generateBarcode();
      const { error } = await db.from('inventory_items').insert({
        tenant_id: tenantId, product_id: productId,
        serial: accSku || null, barcode: barcodeVal,
        condition: 'nuevo', is_new: true, purchase_cost: cost,
        sale_price: price, min_price: minP, quantity: qty, status: 'disponible',
        notes: accNotes || null,
      });
      if (error) throw error;

      toast.success('Producto agregado al inventario');
      resetForm();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['inventory', tenantId] });
      qc.invalidateQueries({ queryKey: ['products', tenantId] });
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSparePart = async () => {
    if (!spCategory || !spName) { toast.error('Completa la categoría y el nombre del repuesto'); return; }
    const cost = parseFloat(spCost) || 0;
    const price = parseFloat(spPrice) || 0;
    const qty = parseInt(spQuantity) || 1;
    if (price <= 0) { toast.error('Ingresa un precio de venta válido'); return; }

    setSaving(true);
    try {
      const brandVal = spBrand || 'Genérico';
      const productName = `${spCategory} - ${spName}`;

      const { data: existingProducts } = await db.from('products').select('id')
        .eq('tenant_id', tenantId).eq('brand', brandVal).eq('name', productName)
        .eq('category', 'repuesto');

      let productId: string;
      if (existingProducts && existingProducts.length > 0) {
        productId = existingProducts[0].id;
      } else {
        const { data: newProduct, error: pErr } = await db.from('products').insert({
          tenant_id: tenantId, name: productName, brand: brandVal,
          color: '', category: 'repuesto', base_price: price,
        }).select('id').single();
        if (pErr) throw pErr;
        productId = newProduct.id;
      }

      const minP = parseFloat(spMinPrice) || 0;
      const barcodeVal = spBarcode || generateBarcode();
      const { error } = await db.from('inventory_items').insert({
        tenant_id: tenantId, product_id: productId,
        serial: spSku || null, barcode: barcodeVal,
        condition: 'nuevo', is_new: true, purchase_cost: cost,
        sale_price: price, min_price: minP, quantity: qty, status: 'disponible',
        notes: spNotes || null,
      });
      if (error) throw error;

      toast.success('Repuesto agregado al inventario');
      resetForm();
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
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Agregar al Inventario
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="celular" className="flex-1 gap-1 text-xs sm:text-sm">
              <Smartphone className="h-3.5 w-3.5" /> Equipo
            </TabsTrigger>
            <TabsTrigger value="accesorio" className="flex-1 gap-1 text-xs sm:text-sm">
              <Headphones className="h-3.5 w-3.5" /> Producto
            </TabsTrigger>
            <TabsTrigger value="repuesto" className="flex-1 gap-1 text-xs sm:text-sm">
              <Wrench className="h-3.5 w-3.5" /> Repuesto
            </TabsTrigger>
          </TabsList>

          {/* ──── DEVICE TAB ──── */}
          <TabsContent value="celular" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marca *</Label>
                {customBrand ? (
                  <div className="flex gap-2">
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Escribe la marca" className="flex-1" autoFocus />
                    <Button type="button" variant="outline" size="sm" onClick={() => { setCustomBrand(false); setBrand(''); setModel(''); setColor(''); setCapacity(''); }}>
                      Catálogo
                    </Button>
                  </div>
                ) : (
                  <Select value={brand} onValueChange={(v) => { if (v === '__other') { setCustomBrand(true); setBrand(''); } else { setBrand(v); } setModel(''); setCustomModel(false); setColor(''); setCapacity(''); }}>
                    <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
                    <SelectContent>
                      {CATALOG_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      <SelectItem value="__other">Otra...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Modelo *</Label>
                {models.length > 0 && !customModel ? (
                  <Select value={model} onValueChange={(v) => { if (v === '__other') { setCustomModel(true); setModel(''); setColor(''); setCapacity(''); } else { setModel(v); setColor(''); setCapacity(''); } }}>
                    <SelectTrigger><SelectValue placeholder="Modelo" /></SelectTrigger>
                    <SelectContent>
                      {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      <SelectItem value="__other">Otro...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Escribe el modelo" className="flex-1" autoFocus={customModel} />
                    {customModel && models.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setCustomModel(false); setModel(''); setColor(''); setCapacity(''); }}>
                        Catálogo
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Color *</Label>
                {colors.length > 0 && !customColor ? (
                  <Select value={color} onValueChange={(v) => { if (v === '__other') { setCustomColor(true); setColor(''); } else { setColor(v); } }}>
                    <SelectTrigger><SelectValue placeholder="Color" /></SelectTrigger>
                    <SelectContent>
                      {colors.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      <SelectItem value="__other">Otro...</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Escribe el color" className="flex-1" autoFocus={customColor} />
                    {customColor && colors.length > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => { setCustomColor(false); setColor(''); }}>
                        Catálogo
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label>Capacidad</Label>
                {storages.length > 0 ? (
                  <Select value={capacity} onValueChange={setCapacity}>
                    <SelectTrigger><SelectValue placeholder="Capacidad" /></SelectTrigger>
                    <SelectContent>
                      {storages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Ej: 128GB" />
                )}
              </div>
            </div>

            <div>
              <Label>IMEI</Label>
              <div className="flex gap-2">
                <Input value={imei} onChange={(e) => setImei(e.target.value)} placeholder="Escanear o escribir IMEI" maxLength={20} className="flex-1" />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowImeiScanner(true)} title="Escanear con cámara">
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Código de Barras</Label>
              <div className="flex gap-2">
                <Input value={deviceBarcode} onChange={(e) => setDeviceBarcode(e.target.value)} placeholder="Escanear o escribir código" className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => setDeviceBarcode(generateBarcode())}>
                  <Barcode className="h-4 w-4 mr-1" /> Generar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Condición</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo">Nuevo</SelectItem>
                    <SelectItem value="usado">Usado</SelectItem>
                    <SelectItem value="reacondicionado">Reacondicionado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grado</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Batería %</Label>
                <Input type="number" min="0" max="100" value={batteryHealth} onChange={(e) => setBatteryHealth(e.target.value)} placeholder="85" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isNew} onCheckedChange={setIsNew} />
              <Label>Equipo nuevo (sellado)</Label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Costo de compra</Label>
                <Input type="number" min="0" step="0.01" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Precio de venta *</Label>
                <Input type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Precio mínimo</Label>
                <Input type="number" min="0" step="0.01" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." rows={2} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSaveDevice} disabled={saving}>
                {saving ? 'Guardando...' : 'Agregar Equipo'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ──── ACCESSORY TAB ──── */}
          <TabsContent value="accesorio" className="space-y-4 mt-4">
            <div>
              <Label>Nombre del producto *</Label>
              <Input value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="Ej: Funda iPhone 15 Pro" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código / SKU</Label>
                <Input value={accSku} onChange={(e) => setAccSku(e.target.value)} placeholder="Ej: FND-IP15P-001" />
              </div>
              <div>
                <Label>Código de Barras</Label>
                <div className="flex gap-2">
                  <Input value={accBarcode} onChange={(e) => setAccBarcode(e.target.value)} placeholder="Código" className="flex-1" />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setAccBarcode(generateBarcode())}>
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Select value={accCategory} onValueChange={setAccCategory}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {ACCESSORY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={accBrand} onChange={(e) => setAccBrand(e.target.value)} placeholder="Genérico" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Color</Label>
                <Input value={accColor} onChange={(e) => setAccColor(e.target.value)} placeholder="N/A" />
              </div>
              <div>
                <Label>Cantidad *</Label>
                <Input type="number" min="1" value={accQuantity} onChange={(e) => setAccQuantity(e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Costo unitario</Label>
                <Input type="number" min="0" step="0.01" value={accCost} onChange={(e) => setAccCost(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Precio de venta *</Label>
                <Input type="number" min="0" step="0.01" value={accPrice} onChange={(e) => setAccPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Precio mínimo</Label>
                <Input type="number" min="0" step="0.01" value={accMinPrice} onChange={(e) => setAccMinPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea value={accNotes} onChange={(e) => setAccNotes(e.target.value)} placeholder="Observaciones..." rows={2} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSaveAccessory} disabled={saving}>
                {saving ? 'Guardando...' : 'Agregar Producto'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ──── SPARE PARTS TAB ──── */}
          <TabsContent value="repuesto" className="space-y-4 mt-4">
            <div>
              <Label>Categoría *</Label>
              {addingCategory ? (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre de la nueva categoría"
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCategory(); } }}
                  />
                  <Button type="button" size="sm" onClick={handleAddCustomCategory}>Agregar</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setAddingCategory(false); setNewCategoryName(''); }}>✕</Button>
                </div>
              ) : (
                <Select value={spCategory} onValueChange={(v) => {
                  if (v === '__add_new') { setAddingCategory(true); }
                  else { setSpCategory(v); }
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {allSpareCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    <SelectItem value="__add_new">+ Agregar nueva categoría</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Nombre específico *</Label>
              <Input value={spName} onChange={(e) => setSpName(e.target.value)} placeholder="Ej: Pantalla iPhone 13 Pro OLED Original" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marca (opcional)</Label>
                <Input value={spBrand} onChange={(e) => setSpBrand(e.target.value)} placeholder="Ej: OEM, Original, Genérico" />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={spSku} onChange={(e) => setSpSku(e.target.value)} placeholder="Ej: PNT-IP13P-001" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código de Barras</Label>
                <div className="flex gap-2">
                  <Input value={spBarcode} onChange={(e) => setSpBarcode(e.target.value)} placeholder="Código" className="flex-1" />
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setSpBarcode(generateBarcode())}>
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Cantidad *</Label>
                <Input type="number" min="1" value={spQuantity} onChange={(e) => setSpQuantity(e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Costo unitario</Label>
                <Input type="number" min="0" step="0.01" value={spCost} onChange={(e) => setSpCost(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Precio de venta *</Label>
                <Input type="number" min="0" step="0.01" value={spPrice} onChange={(e) => setSpPrice(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Precio mínimo</Label>
                <Input type="number" min="0" step="0.01" value={spMinPrice} onChange={(e) => setSpMinPrice(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea value={spNotes} onChange={(e) => setSpNotes(e.target.value)} placeholder="Observaciones..." rows={2} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSaveSparePart} disabled={saving}>
                {saving ? 'Guardando...' : 'Agregar Repuesto'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
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
        <ImeiCameraScanner
          active={showImeiScanner}
          onScan={(code) => {
            setImei(code);
            setShowImeiScanner(false);
          }}
        />
        <Button variant="outline" onClick={() => setShowImeiScanner(false)}>Cerrar</Button>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ImeiCameraScanner({ active, onScan }: { active: boolean; onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return;
    const { cleanup } = startSafeScanner(
      'imei-scanner-container',
      (code) => onScanRef.current(code)
    );
    return cleanup;
  }, [active]);

  return <div id="imei-scanner-container" className="w-full rounded-lg overflow-hidden" />;
}
