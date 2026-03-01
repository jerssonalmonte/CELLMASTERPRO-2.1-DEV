import { useState, useCallback, useRef, useMemo } from 'react';
import { CustomerAutocomplete } from '@/components/CustomerAutocomplete';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { printRepairReceipt } from '@/components/PrintReceipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wrench, Plus, Printer, GripVertical, Phone, User, Smartphone, AlertCircle, Edit, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Repair, RepairStatus, RepairChecklist } from '@/types';
import { CATALOG_BRANDS, DEVICE_CATALOG } from '@/data/deviceCatalog';

const STATUSES: { key: RepairStatus; label: string; color: string }[] = [
  { key: 'recibido', label: 'Recibido', color: 'bg-status-received' },
  { key: 'diagnosticando', label: 'Diagnosticando', color: 'bg-status-process' },
  { key: 'espera_pieza', label: 'Espera Pieza', color: 'bg-status-waiting' },
  { key: 'en_proceso', label: 'En Proceso', color: 'bg-status-process' },
  { key: 'en_prueba', label: 'En Prueba', color: 'bg-status-testing' },
  { key: 'listo', label: 'Listo', color: 'bg-status-ready' },
  { key: 'entregado', label: 'Entregado', color: 'bg-status-done' },
  { key: 'no_se_pudo', label: 'No se pudo', color: 'bg-destructive' },
];

const CHECKLIST_LABELS: Record<keyof RepairChecklist, string> = {
  brokenScreen: 'Pantalla rota',
  scratchedBack: 'Tapa rayada',
  noDisplay: 'Sin display',
  sunkenButtons: 'Botones hundidos',
  missingParts: 'Partes faltantes',
  waterDamage: 'Daño por agua',
  crackedBack: 'Tapa agrietada',
  chargerPortDamage: 'Puerto de carga dañado',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  recibido: 'bg-status-received-bg text-status-received',
  diagnosticando: 'bg-status-process-bg text-status-process',
  espera_pieza: 'bg-status-waiting-bg text-status-waiting',
  en_proceso: 'bg-status-process-bg text-status-process',
  en_prueba: 'bg-status-testing-bg text-status-testing',
  listo: 'bg-status-ready-bg text-status-ready',
  entregado: 'bg-status-done-bg text-status-done',
  no_se_pudo: 'bg-destructive/15 text-destructive',
};

export default function Taller() {
  const { repairs, customers, createRepair, updateRepair, upsertCustomer } = useStore();
  const { tenant } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [customBrand, setCustomBrand] = useState('');
  const [useCustomBrand, setUseCustomBrand] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', brand: '', model: '', imei: '', color: '',
    lockCode: '', reportedFault: '', laborCost: '', partsCost: '', totalPrice: '',
    advance: '', notes: '',
  });
  const [checklist, setChecklist] = useState<RepairChecklist>({});
  const [manualTotal, setManualTotal] = useState(false);

  const repairsByStatus = useMemo(() => {
    const map: Record<string, Repair[]> = {};
    STATUSES.forEach((s) => { map[s.key] = []; });
    repairs.forEach((r) => {
      if (map[r.status]) map[r.status].push(r);
    });
    return map;
  }, [repairs]);

  const models = useMemo(() => {
    if (!form.brand || useCustomBrand) return [];
    return DEVICE_CATALOG.filter((d) => d.brand === form.brand).map((d) => d.model);
  }, [form.brand, useCustomBrand]);

  const resetForm = () => {
    setForm({ customerName: '', customerPhone: '', brand: '', model: '', imei: '', color: '', lockCode: '', reportedFault: '', laborCost: '', partsCost: '', totalPrice: '', advance: '', notes: '' });
    setChecklist({});
    setManualTotal(false);
    setEditingRepair(null);
    setCustomBrand('');
    setUseCustomBrand(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (repair: Repair) => {
    setEditingRepair(repair);
    const isCatalogBrand = CATALOG_BRANDS.includes(repair.brand);
    setUseCustomBrand(!isCatalogBrand);
    setCustomBrand(!isCatalogBrand ? repair.brand : '');
    setForm({
      customerName: repair.customer_name,
      customerPhone: repair.customer_phone || '',
      brand: isCatalogBrand ? repair.brand : '',
      model: repair.model,
      imei: repair.imei || '',
      color: repair.color || '',
      lockCode: repair.lock_code || '',
      reportedFault: repair.reported_fault,
      laborCost: repair.labor_cost.toString(),
      partsCost: repair.parts_cost.toString(),
      totalPrice: repair.total_price.toString(),
      advance: repair.advance.toString(),
      notes: repair.notes || '',
    });
    setChecklist(repair.checklist || {});
    setShowForm(true);
  };

  const computedTotal = useMemo(() => {
    if (manualTotal) return parseFloat(form.totalPrice) || 0;
    return (parseFloat(form.laborCost) || 0) + (parseFloat(form.partsCost) || 0);
  }, [form.laborCost, form.partsCost, form.totalPrice, manualTotal]);

  const computedBalance = computedTotal - (parseFloat(form.advance) || 0);

  const finalBrand = useCustomBrand ? customBrand : form.brand;

  const handleSubmit = async () => {
    if (!form.customerName || !finalBrand || !form.model || !form.reportedFault) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const repairData = {
      customer_name: form.customerName,
      customer_phone: form.customerPhone,
      brand: finalBrand,
      model: form.model,
      imei: form.imei,
      color: form.color,
      lock_code: form.lockCode,
      reported_fault: form.reportedFault,
      checklist,
      labor_cost: parseFloat(form.laborCost) || 0,
      parts_cost: parseFloat(form.partsCost) || 0,
      total_price: computedTotal,
      advance: parseFloat(form.advance) || 0,
      balance: Math.max(0, computedBalance),
      notes: form.notes,
      status: (editingRepair ? editingRepair.status : 'recibido') as RepairStatus,
      received_at: editingRepair ? editingRepair.received_at : new Date().toISOString(),
    };

    if (editingRepair) {
      await updateRepair(editingRepair.id, repairData);
      const updatedRepair: Repair = { ...editingRepair, ...repairData };
      toast.success('Orden actualizada');
      // Print updated receipt
      printRepairReceipt(updatedRepair, tenant?.name, tenant?.logo_url || undefined);
    } else {
      const newRepair = await createRepair(repairData);
      upsertCustomer(form.customerName, form.customerPhone);
      printRepairReceipt(newRepair, tenant?.name, tenant?.logo_url || undefined);
      toast.success('Orden creada e impresa');
    }

    setShowForm(false);
    resetForm();
  };

  const handlePrintFromEdit = () => {
    if (!editingRepair) return;
    // Build the latest data from the form for printing
    const currentData: Repair = {
      ...editingRepair,
      customer_name: form.customerName,
      customer_phone: form.customerPhone,
      brand: finalBrand,
      model: form.model,
      imei: form.imei,
      color: form.color,
      lock_code: form.lockCode,
      reported_fault: form.reportedFault,
      checklist,
      labor_cost: parseFloat(form.laborCost) || 0,
      parts_cost: parseFloat(form.partsCost) || 0,
      total_price: computedTotal,
      advance: parseFloat(form.advance) || 0,
      balance: Math.max(0, computedBalance),
      notes: form.notes,
    };
    printRepairReceipt(currentData, tenant?.name, tenant?.logo_url || undefined);
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, repairId: string) => {
    setDraggedId(repairId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: RepairStatus) => {
    e.preventDefault();
    if (draggedId) {
      updateRepair(draggedId, {
        status,
        ...(status === 'entregado' ? { delivered_at: new Date().toISOString() } : {}),
      });
      toast.success(`Orden movida a "${STATUSES.find((s) => s.key === status)?.label}"`);
    }
    setDraggedId(null);
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <div>
            <h1 className="page-title">Taller de Reparaciones</h1>
            {tenant && <p className="text-sm text-muted-foreground mt-0.5">{tenant.name}</p>}
          </div>
          <Button onClick={openCreate} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Orden
          </Button>
        </div>

        {/* Kanban Board - Trello/Asana style */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
          {STATUSES.map((s) => (
            <div
              key={s.key}
              className="kanban-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, s.key)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2.5">
                <span className={`h-3 w-3 rounded-full ${s.color}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{s.label}</span>
                <span className="ml-auto rounded-full bg-background/80 px-2 py-0.5 text-xs font-bold leading-none shadow-sm">
                  {repairsByStatus[s.key]?.length || 0}
                </span>
              </div>

              {/* Cards container */}
              <div className="flex flex-col gap-2 min-h-[120px] rounded-xl bg-muted/20 border border-border/30 p-2 flex-1">
                {repairsByStatus[s.key]?.map((repair) => (
                  <div
                    key={repair.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, repair.id)}
                    onClick={() => openEdit(repair)}
                    className={`repair-card group ${draggedId === repair.id ? 'opacity-40 scale-95 rotate-1' : ''}`}
                  >
                    {/* Header: ID + Status badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground/50">#{repair.id.slice(0, 6).toUpperCase()}</span>
                      <Badge className={`${STATUS_BADGE_CLASSES[repair.status] || ''} text-[10px] px-1.5 py-0 h-4`}>
                        {STATUSES.find((st) => st.key === repair.status)?.label}
                      </Badge>
                    </div>

                    {/* Device name */}
                    <p className="font-semibold text-foreground">{repair.brand} {repair.model}</p>

                    {/* Customer */}
                    <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="truncate text-xs">{repair.customer_name}</span>
                    </div>

                    {/* Fault description */}
                    <p className="mt-2 text-muted-foreground text-xs line-clamp-2 border-l-2 border-primary/20 pl-2">
                      {repair.reported_fault}
                    </p>

                    {/* Footer: Price + Balance */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
                      <span className="font-bold text-foreground">{formatCurrency(repair.total_price)}</span>
                      {repair.balance > 0 && (
                        <span className="text-[11px] font-semibold text-status-waiting bg-status-waiting/10 px-1.5 py-0.5 rounded">
                          Resta {formatCurrency(repair.balance)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {(!repairsByStatus[s.key] || repairsByStatus[s.key].length === 0) && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/30">
                    <Wrench className="h-5 w-5 mb-1" />
                    <p className="text-xs">Sin órdenes</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                {editingRepair ? 'Editar Orden de Reparación' : 'Nueva Orden de Reparación'}
              </DialogTitle>
              {editingRepair && (
                <p className="text-xs text-muted-foreground">ID: {editingRepair.id.slice(0, 8).toUpperCase()}</p>
              )}
            </DialogHeader>

            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-3 rounded-lg border border-border/50 p-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Cliente</h3>
                <CustomerAutocomplete
                  customers={customers}
                  customerName={form.customerName}
                  customerPhone={form.customerPhone}
                  onSelectCustomer={(c) => {
                    setForm((f) => ({ ...f, customerName: c.full_name, customerPhone: c.phone || '' }));
                  }}
                  onNameChange={(v) => setForm((f) => ({ ...f, customerName: v }))}
                  onPhoneChange={(v) => setForm((f) => ({ ...f, customerPhone: v }))}
                  showCedula={false}
                />
              </div>

              {/* Device */}
              <div className="space-y-3 rounded-lg border border-border/50 p-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Equipo</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Marca *</Label>
                    {useCustomBrand ? (
                      <div className="flex gap-2">
                        <Input 
                          value={customBrand} 
                          onChange={(e) => setCustomBrand(e.target.value)} 
                          placeholder="Escribir marca..." 
                          className="flex-1"
                        />
                        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setUseCustomBrand(false); setCustomBrand(''); }}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Select value={form.brand} onValueChange={(v) => {
                        if (v === '__custom__') {
                          setUseCustomBrand(true);
                          setForm((f) => ({ ...f, brand: '', model: '' }));
                        } else {
                          setForm((f) => ({ ...f, brand: v, model: '' }));
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {CATALOG_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          <SelectItem value="__custom__">+ Agregar otra marca</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label>Modelo *</Label>
                    {models.length > 0 && !useCustomBrand ? (
                      <Select value={form.model} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ej: Galaxy S23" />
                    )}
                  </div>
                  <div>
                    <Label>IMEI</Label>
                    <Input value={form.imei} onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Código de Bloqueo</Label>
                    <Input value={form.lockCode} onChange={(e) => setForm((f) => ({ ...f, lockCode: e.target.value }))} placeholder="PIN / Patrón" />
                  </div>
                </div>
              </div>

              {/* Fault */}
              <div className="rounded-lg border border-border/50 p-3 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-status-waiting" /> Falla</h3>
                <div>
                  <Label>Falla Reportada *</Label>
                  <Textarea
                    value={form.reportedFault}
                    onChange={(e) => setForm((f) => ({ ...f, reportedFault: e.target.value }))}
                    placeholder="Describe la falla del equipo. Puede agregar múltiples fallas separadas por comas o líneas..."
                    rows={3}
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Condición Física</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(CHECKLIST_LABELS) as [keyof RepairChecklist, string][]).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                        <span className="text-xs">{label}</span>
                        <Switch
                          checked={!!checklist[key]}
                          onCheckedChange={(v) => setChecklist((prev) => ({ ...prev, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Costs */}
              <div className="rounded-lg border border-border/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">💰 Costos</h3>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="manual-total" className="text-xs text-muted-foreground">Total manual</Label>
                    <Switch id="manual-total" checked={manualTotal} onCheckedChange={setManualTotal} />
                  </div>
                </div>
                {!manualTotal ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Mano de Obra</Label>
                      <Input type="number" value={form.laborCost} onChange={(e) => setForm((f) => ({ ...f, laborCost: e.target.value }))} placeholder="0" />
                    </div>
                    <div>
                      <Label>Repuestos</Label>
                      <Input type="number" value={form.partsCost} onChange={(e) => setForm((f) => ({ ...f, partsCost: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Total</Label>
                    <Input type="number" value={form.totalPrice} onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))} placeholder="0" />
                  </div>
                )}
                <div>
                  <Label>Adelanto</Label>
                  <Input type="number" value={form.advance} onChange={(e) => setForm((f) => ({ ...f, advance: e.target.value }))} placeholder="0" />
                </div>
                <div className="flex justify-between rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm">
                  <span>Total: <strong className="text-primary">{formatCurrency(computedTotal)}</strong></span>
                  <span>Resta: <strong className={computedBalance > 0 ? 'text-status-waiting' : 'text-status-ok'}>{formatCurrency(Math.max(0, computedBalance))}</strong></span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Notas Internas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>

              {/* Status (edit only) */}
              {editingRepair && (
                <div className="rounded-lg border border-border/50 p-3">
                  <Label>Estado</Label>
                  <Select
                    value={editingRepair.status}
                    onValueChange={(v) => {
                      setEditingRepair((prev) => prev ? { ...prev, status: v as RepairStatus } : null);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 mt-4">
              {editingRepair && (
                <Button variant="outline" size="sm" onClick={handlePrintFromEdit} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" /> Imprimir Recibo
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {editingRepair ? 'Guardar e Imprimir' : 'Crear e Imprimir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
