import { useState, useEffect, useMemo } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Calendar, Plus, MapPin, Clock, Building2, Phone, User,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Wrench,
  Handshake, HelpCircle, MoreHorizontal, Trash2, Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isSameDay, isToday, setHours, setMinutes,
  startOfDay, endOfDay, isBefore,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const db = supabase as any;

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  installation: { label: 'Instalación', icon: Wrench, color: 'text-blue-400 bg-blue-500/10' },
  sales_meeting: { label: 'Reunión de Ventas', icon: Handshake, color: 'text-emerald-400 bg-emerald-500/10' },
  support: { label: 'Soporte', icon: HelpCircle, color: 'text-amber-400 bg-amber-500/10' },
  other: { label: 'Otro', icon: MoreHorizontal, color: 'text-slate-400 bg-slate-500/10' },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Agendada', cls: 'border-blue-500/20 text-blue-400 bg-blue-500/10' },
  completed: { label: 'Completada', cls: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' },
  cancelled: { label: 'Cancelada', cls: 'border-red-500/20 text-red-400 bg-red-500/10' },
};

export default function AdminAgenda() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any>(null);

  // Form
  const [form, setForm] = useState({
    title: '', type: 'installation', tenant_id: '', scheduled_date: undefined as Date | undefined,
    scheduled_time: '09:00', duration_minutes: '60', location: '', notes: '',
    contact_name: '', contact_phone: '', status: 'scheduled',
  });

  const loadData = async () => {
    const [a, t] = await Promise.all([
      db.from('saas_appointments').select('*').order('scheduled_at', { ascending: true }),
      db.from('tenants').select('id, name, slug').order('name'),
    ]);
    setAppointments(a.data || []);
    setTenants(t.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekAppointments = useMemo(() => {
    return appointments.filter(a => {
      const d = parseISO(a.scheduled_at);
      return d >= startOfDay(weekStart) && d <= endOfDay(weekEnd);
    });
  }, [appointments, weekStart, weekEnd]);

  const todayAppts = useMemo(() =>
    appointments.filter(a => isSameDay(parseISO(a.scheduled_at), new Date()) && a.status === 'scheduled'),
  [appointments]);

  const upcomingCount = appointments.filter(a => a.status === 'scheduled' && !isBefore(parseISO(a.scheduled_at), new Date())).length;

  const resetForm = () => {
    setForm({
      title: '', type: 'installation', tenant_id: '', scheduled_date: undefined,
      scheduled_time: '09:00', duration_minutes: '60', location: '', notes: '',
      contact_name: '', contact_phone: '', status: 'scheduled',
    });
    setEditingAppt(null);
  };

  const openNew = (day?: Date) => {
    resetForm();
    if (day) setForm(f => ({ ...f, scheduled_date: day }));
    setDialogOpen(true);
  };

  const openEdit = (appt: any) => {
    const d = parseISO(appt.scheduled_at);
    setEditingAppt(appt);
    setForm({
      title: appt.title, type: appt.type, tenant_id: appt.tenant_id || '',
      scheduled_date: d, scheduled_time: format(d, 'HH:mm'),
      duration_minutes: String(appt.duration_minutes),
      location: appt.location || '', notes: appt.notes || '',
      contact_name: appt.contact_name || '', contact_phone: appt.contact_phone || '',
      status: appt.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.scheduled_date) return;
    const [h, m] = form.scheduled_time.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(form.scheduled_date, h), m);

    const payload = {
      title: form.title,
      type: form.type,
      tenant_id: form.tenant_id || null,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: parseInt(form.duration_minutes) || 60,
      location: form.location || null,
      notes: form.notes || null,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      status: form.status,
    };

    try {
      if (editingAppt) {
        const { error } = await db.from('saas_appointments').update(payload).eq('id', editingAppt.id);
        if (error) throw error;
        toast.success('Cita actualizada');
      } else {
        const { error } = await db.from('saas_appointments').insert(payload);
        if (error) throw error;
        toast.success('Cita agendada');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await db.from('saas_appointments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Cita eliminada');
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await db.from('saas_appointments').update({ status }).eq('id', id);
      if (error) throw error;
      toast.success(`Estado: ${STATUS_CONFIG[status]?.label}`);
      loadData();
    } catch (err: any) { toast.error(err.message || 'Error'); }
  };

  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || '';

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1440px] mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-50">Agenda</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {todayAppts.length} cita{todayAppts.length !== 1 ? 's' : ''} hoy · {upcomingCount} próximas
            </p>
          </div>
          <Button onClick={() => openNew()} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" size="sm">
            <Plus className="h-3.5 w-3.5" /> Agendar Visita
          </Button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <div className="text-sm font-medium text-slate-200">
            {format(weekStart, "d MMM", { locale: es })} — {format(weekEnd, "d MMM yyyy", { locale: es })}
          </div>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayAppts = weekAppointments.filter(a => isSameDay(parseISO(a.scheduled_at), day));
            const today_ = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'admin-card p-3 min-h-[140px] cursor-pointer transition-all hover:border-blue-500/20',
                  today_ && 'border-blue-500/30 bg-blue-500/[0.03]'
                )}
                onClick={() => openNew(day)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'text-[11px] font-medium uppercase',
                    today_ ? 'text-blue-400' : 'text-slate-500'
                  )}>
                    {format(day, 'EEE', { locale: es })}
                  </span>
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    today_ ? 'text-blue-400' : 'text-slate-300'
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayAppts.slice(0, 3).map(appt => {
                    const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.other;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={appt.id}
                        className={cn(
                          'rounded-md px-2 py-1.5 text-[10px] leading-tight cursor-pointer transition-colors',
                          appt.status === 'cancelled' ? 'bg-white/[0.02] text-slate-500 line-through' :
                          appt.status === 'completed' ? 'bg-emerald-500/[0.06] text-emerald-400' :
                          'bg-white/[0.04] text-slate-300 hover:bg-white/[0.06]'
                        )}
                        onClick={(e) => { e.stopPropagation(); openEdit(appt); }}
                      >
                        <div className="flex items-center gap-1">
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="font-medium truncate">{format(parseISO(appt.scheduled_at), 'HH:mm')}</span>
                        </div>
                        <p className="truncate mt-0.5">{appt.title}</p>
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 && (
                    <p className="text-[10px] text-slate-500 text-center">+{dayAppts.length - 3} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's Schedule (detailed list) */}
        <div className="admin-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">Agenda de Hoy</h3>
            <Badge variant="outline" className="text-[10px] border-blue-500/20 text-blue-400 ml-auto">
              {todayAppts.length} pendiente{todayAppts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {todayAppts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-[13px] text-slate-500">Sin citas agendadas para hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppts.map(appt => <AppointmentRow key={appt.id} appt={appt} getTenantName={getTenantName} onEdit={openEdit} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
            </div>
          )}
        </div>

        {/* All upcoming */}
        {appointments.filter(a => a.status === 'scheduled' && !isBefore(parseISO(a.scheduled_at), startOfDay(new Date()))).length > 0 && (
          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-4">Próximas Citas</h3>
            <div className="space-y-2">
              {appointments
                .filter(a => a.status === 'scheduled' && !isBefore(parseISO(a.scheduled_at), startOfDay(new Date())))
                .slice(0, 10)
                .map(appt => <AppointmentRow key={appt.id} appt={appt} getTenantName={getTenantName} onEdit={openEdit} onStatusChange={handleStatusChange} onDelete={handleDelete} />)}
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={o => { if (!o) { setDialogOpen(false); resetForm(); } }}>
          <DialogContent className="sm:max-w-lg bg-[hsl(220,20%,10%)] border-white/[0.08] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                {editingAppt ? 'Editar Cita' : 'Agendar Nueva Visita'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Título *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Instalación CellMaster - Tienda X" className="bg-white/[0.03] border-white/[0.08] mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Tipo</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Organización</Label>
                  <Select value={form.tenant_id} onValueChange={v => setForm(f => ({ ...f, tenant_id: v }))}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] mt-1"><SelectValue placeholder="(Prospecto)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin organización</SelectItem>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Fecha *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal border-white/[0.08] mt-1", !form.scheduled_date && "text-muted-foreground")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {form.scheduled_date ? format(form.scheduled_date, 'd MMM yyyy', { locale: es }) : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker mode="single" selected={form.scheduled_date} onSelect={d => setForm(f => ({ ...f, scheduled_date: d }))} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-slate-300">Hora</Label>
                  <Input type="time" value={form.scheduled_time} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} className="bg-white/[0.03] border-white/[0.08] mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Duración (min)</Label>
                  <Select value={form.duration_minutes} onValueChange={v => setForm(f => ({ ...f, duration_minutes: v }))}>
                    <SelectTrigger className="bg-white/[0.03] border-white/[0.08] mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="90">1.5 horas</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                      <SelectItem value="180">3 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingAppt && (
                  <div>
                    <Label className="text-slate-300">Estado</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.08] mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Agendada</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-slate-300">Ubicación</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Dirección o referencia" className="bg-white/[0.03] border-white/[0.08] mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-300">Contacto</Label>
                  <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Nombre" className="bg-white/[0.03] border-white/[0.08] mt-1" />
                </div>
                <div>
                  <Label className="text-slate-300">Teléfono</Label>
                  <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="809-000-0000" className="bg-white/[0.03] border-white/[0.08] mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Notas</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Detalles adicionales..." className="bg-white/[0.03] border-white/[0.08] mt-1 resize-none" rows={2} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              {editingAppt && (
                <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 mr-auto" onClick={() => { handleDelete(editingAppt.id); setDialogOpen(false); }}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
                </Button>
              )}
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} className="border-white/[0.08]">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.title || !form.scheduled_date} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingAppt ? 'Actualizar' : 'Agendar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}

/* ─── Appointment Row ─── */
function AppointmentRow({ appt, getTenantName, onEdit, onStatusChange, onDelete }: any) {
  const cfg = TYPE_CONFIG[appt.type] || TYPE_CONFIG.other;
  const Icon = cfg.icon;
  const d = parseISO(appt.scheduled_at);
  const tenantName = appt.tenant_id ? getTenantName(appt.tenant_id) : null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.04] transition-colors group">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-slate-200 truncate">{appt.title}</p>
          <Badge variant="outline" className={`text-[9px] shrink-0 ${STATUS_CONFIG[appt.status]?.cls || ''}`}>
            {STATUS_CONFIG[appt.status]?.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {format(d, "d MMM · HH:mm", { locale: es })} ({appt.duration_minutes}min)
          </span>
          {tenantName && (
            <span className="flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5" /> {tenantName}
            </span>
          )}
          {appt.location && (
            <span className="flex items-center gap-1 hidden sm:flex">
              <MapPin className="h-2.5 w-2.5" /> {appt.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {appt.status === 'scheduled' && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/10" title="Completar" onClick={() => onStatusChange(appt.id, 'completed')}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-400" title="Editar" onClick={() => onEdit(appt)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
