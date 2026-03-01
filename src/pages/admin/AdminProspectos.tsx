import { useState, useEffect, useRef } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Phone, Mail, DollarSign, GripVertical, Rocket,
  UserPlus, Building2, Loader2, Trash2, Edit2, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isPasswordStrong } from '@/lib/passwordValidation';
import { PasswordChecklist } from '@/components/PasswordChecklist';

const db = supabase as any;

const COLUMNS: { key: string; label: string; color: string; icon: any }[] = [
  { key: 'new', label: 'Nuevo', color: 'bg-blue-500', icon: Target },
  { key: 'contacted', label: 'Contactado', color: 'bg-amber-500', icon: Phone },
  { key: 'demo_given', label: 'Demo Dada', color: 'bg-cyan-500', icon: Rocket },
  { key: 'won', label: 'Ganado', color: 'bg-emerald-500', icon: Building2 },
  { key: 'lost', label: 'Perdido', color: 'bg-red-500', icon: Trash2 },
];

interface Lead {
  id: string;
  business_name: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  potential_value: number;
  notes: string | null;
  created_at: string;
}

const initialForm = {
  business_name: '', owner_name: '', phone: '', email: '',
  status: 'new', potential_value: '', notes: '',
};

export default function AdminProspectos() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Convert to org dialog
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [convertForm, setConvertForm] = useState({ slug: '', adminName: '', adminEmail: '', adminPassword: '' });
  const [converting, setConverting] = useState(false);

  const loadLeads = async () => {
    const { data } = await db.from('saas_leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  const openCreate = () => {
    setEditLead(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({
      business_name: lead.business_name,
      owner_name: lead.owner_name,
      phone: lead.phone || '',
      email: lead.email || '',
      status: lead.status,
      potential_value: String(lead.potential_value),
      notes: lead.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.business_name || !form.owner_name) { toast.error('Nombre del negocio y propietario son requeridos'); return; }
    setSaving(true);
    try {
      const payload = {
        business_name: form.business_name,
        owner_name: form.owner_name,
        phone: form.phone || null,
        email: form.email || null,
        status: form.status,
        potential_value: Number(form.potential_value) || 0,
        notes: form.notes || null,
      };
      if (editLead) {
        const { error } = await db.from('saas_leads').update(payload).eq('id', editLead.id);
        if (error) throw error;
        toast.success('Prospecto actualizado');
      } else {
        const { error } = await db.from('saas_leads').insert(payload);
        if (error) throw error;
        toast.success('Prospecto creado');
      }
      setShowForm(false);
      loadLeads();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await db.from('saas_leads').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Prospecto eliminado');
    loadLeads();
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };

  const handleDragLeave = () => { setDragOverCol(null); };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;
    const lead = leads.find(l => l.id === draggedId);
    if (!lead || lead.status === newStatus) { setDraggedId(null); return; }

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === draggedId ? { ...l, status: newStatus } : l));
    setDraggedId(null);

    const { error } = await db.from('saas_leads').update({ status: newStatus }).eq('id', draggedId);
    if (error) { toast.error('Error al mover prospecto'); loadLeads(); return; }

    if (newStatus === 'won') {
      const updated = leads.find(l => l.id === draggedId);
      if (updated) {
        setConvertLead({ ...updated, status: 'won' });
        setConvertForm({
          slug: updated.business_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          adminName: updated.owner_name,
          adminEmail: updated.email || '',
          adminPassword: '',
        });
      }
    }
  };

  const handleConvertToOrg = async () => {
    if (!convertLead) return;
    if (!convertForm.adminEmail || !convertForm.adminPassword || !convertForm.adminName) {
      toast.error('Completa email, nombre y contraseña del admin');
      return;
    }
    if (!isPasswordStrong(convertForm.adminPassword)) {
      toast.error('La contraseña no cumple los requisitos');
      return;
    }
    setConverting(true);
    try {
      const slug = convertForm.slug || convertLead.business_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const { data: existing } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
      if (existing) { toast.error(`Ya existe una organización con slug "${slug}"`); setConverting(false); return; }

      const { data: tenantData, error: tErr } = await db.from('tenants').insert({
        name: convertLead.business_name, slug,
      }).select().single();
      if (tErr) throw tErr;

      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-user', {
        body: {
          email: convertForm.adminEmail,
          password: convertForm.adminPassword,
          full_name: convertForm.adminName,
          role: 'admin',
          tenant_id: tenantData.id,
        },
      });
      if (fnErr) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);

      toast.success(`🎉 "${convertLead.business_name}" convertido a organización activa`);
      setConvertLead(null);
      loadLeads();
    } catch (err: any) { toast.error(err.message); } finally { setConverting(false); }
  };

  const getLeadsByStatus = (status: string) => leads.filter(l => l.status === status);

  const totalPipeline = leads
    .filter(l => !['won', 'lost'].includes(l.status))
    .reduce((s, l) => s + Number(l.potential_value), 0);
  const totalWon = leads.filter(l => l.status === 'won').reduce((s, l) => s + Number(l.potential_value), 0);

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50">Pipeline de Prospectos</h1>
            <p className="text-sm text-slate-400 mt-0.5">Gestiona tu funnel de ventas de software</p>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9 text-[13px]">
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo Prospecto
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="admin-card p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Total Prospectos</p>
            <p className="text-lg font-bold text-slate-50 mt-0.5 tabular-nums">{leads.length}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">En Pipeline</p>
            <p className="text-lg font-bold text-blue-400 mt-0.5 tabular-nums">{leads.filter(l => !['won','lost'].includes(l.status)).length}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Valor Pipeline</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5 tabular-nums">${totalPipeline.toLocaleString()}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Ganados</p>
            <p className="text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">${totalWon.toLocaleString()}</p>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            {COLUMNS.map(col => {
              const colLeads = getLeadsByStatus(col.key);
              const Icon = col.icon;
              return (
                <div
                  key={col.key}
                  className={`flex-shrink-0 w-[280px] sm:w-auto sm:flex-1 rounded-xl border transition-colors duration-200 ${
                    dragOverCol === col.key
                      ? 'border-blue-500/40 bg-blue-500/[0.04]'
                      : 'border-white/[0.06] bg-[hsl(228,22%,8%)]'
                  }`}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 p-3 border-b border-white/[0.06]">
                    <div className={`h-2 w-2 rounded-full ${col.color}`} />
                    <span className="text-[13px] font-semibold text-slate-200">{col.label}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] bg-white/[0.06] text-slate-400">{colLeads.length}</Badge>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-360px)] overflow-y-auto">
                    {colLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={`group rounded-lg border border-white/[0.06] bg-[hsl(220,20%,10%)] p-3 cursor-grab active:cursor-grabbing transition-all hover:border-white/[0.12] ${
                          draggedId === lead.id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="h-3.5 w-3.5 text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <p className="text-[13px] font-semibold text-slate-100 truncate">{lead.business_name}</p>
                          </div>
                          <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(lead)} className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300">
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(lead.id)} className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <p className="text-[12px] text-slate-400 mt-1">{lead.owner_name}</p>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
                          {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                          {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                        </div>

                        {lead.potential_value > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-emerald-400">
                            <DollarSign className="h-3 w-3" />
                            {Number(lead.potential_value).toLocaleString()}/mes
                          </div>
                        )}

                        {lead.status === 'won' && (
                          <Button
                            size="sm"
                            className="mt-2.5 w-full h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvertLead(lead);
                              setConvertForm({
                                slug: lead.business_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                                adminName: lead.owner_name,
                                adminEmail: lead.email || '',
                                adminPassword: '',
                              });
                            }}
                          >
                            <Rocket className="h-3 w-3 mr-1" /> Convertir a Organización
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Lead Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[hsl(228,22%,10%)] border-white/[0.08] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editLead ? 'Editar Prospecto' : 'Nuevo Prospecto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300 text-[12px]">Nombre del Negocio *</Label>
              <Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
            </div>
            <div>
              <Label className="text-slate-300 text-[12px]">Propietario *</Label>
              <Input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-[12px]">Teléfono</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-[12px]">Email</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-[12px]">Valor Mensual Estimado</Label>
                <Input type="number" value={form.potential_value} onChange={e => setForm(f => ({ ...f, potential_value: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" placeholder="0" />
              </div>
              <div>
                <Label className="text-slate-300 text-[12px]">Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[hsl(228,22%,12%)] border-white/[0.08]">
                    {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-[12px]">Notas</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1 min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-white/[0.08] text-slate-300">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editLead ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Organization Dialog */}
      <Dialog open={!!convertLead} onOpenChange={() => setConvertLead(null)}>
        <DialogContent className="bg-[hsl(228,22%,10%)] border-white/[0.08] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-emerald-400" />
              Convertir a Organización
            </DialogTitle>
          </DialogHeader>
          {convertLead && (
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 p-3">
                <p className="text-[13px] font-semibold text-emerald-400">{convertLead.business_name}</p>
                <p className="text-[12px] text-slate-400 mt-0.5">Se creará como nueva organización con un usuario administrador</p>
              </div>
              <div>
                <Label className="text-slate-300 text-[12px]">Slug de la organización</Label>
                <Input value={convertForm.slug} onChange={e => setConvertForm(f => ({ ...f, slug: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1 font-mono text-[13px]" />
              </div>
              <div>
                <Label className="text-slate-300 text-[12px]">Nombre del Admin *</Label>
                <Input value={convertForm.adminName} onChange={e => setConvertForm(f => ({ ...f, adminName: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-[12px]">Email del Admin *</Label>
                <Input type="email" value={convertForm.adminEmail} onChange={e => setConvertForm(f => ({ ...f, adminEmail: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
              </div>
              <div>
                <Label className="text-slate-300 text-[12px]">Contraseña del Admin *</Label>
                <Input type="password" value={convertForm.adminPassword} onChange={e => setConvertForm(f => ({ ...f, adminPassword: e.target.value }))}
                  className="bg-white/[0.04] border-white/[0.08] text-slate-100 mt-1" />
                <PasswordChecklist password={convertForm.adminPassword} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertLead(null)} className="border-white/[0.08] text-slate-300">Cancelar</Button>
            <Button onClick={handleConvertToOrg} disabled={converting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Rocket className="h-4 w-4 mr-1.5" /> Crear Organización</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
