import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Users, Search, Plus, Edit2, Phone, Mail, MapPin, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

const db = supabase as any;

export default function Clientes() {
  const { customers } = useStore();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const tenantId = profile?.tenant_id;
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('clientes');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', cedula: '', email: '', address: '', notes: '' });

  // Suppliers query
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);

  const loadSuppliers = async () => {
    if (!tenantId) return;
    const { data } = await db.from('suppliers').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
    setSuppliers(data || []);
    setSuppliersLoaded(true);
  };

  if (tab === 'proveedores' && !suppliersLoaded) loadSuppliers();

  const filtered = useMemo(() => {
    const list = tab === 'clientes' ? customers : suppliers;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((c: any) =>
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.cedula?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [tab, customers, suppliers, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: '', phone: '', cedula: '', email: '', address: '', notes: '' });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      full_name: item.full_name || '',
      phone: item.phone || '',
      cedula: item.cedula || '',
      email: item.email || '',
      address: item.address || '',
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!tenantId) return;

    const table = tab === 'clientes' ? 'customers' : 'suppliers';

    if (editing) {
      await db.from(table).update(form).eq('id', editing.id);
      toast.success(`${tab === 'clientes' ? 'Cliente' : 'Proveedor'} actualizado`);
    } else {
      await db.from(table).insert({ ...form, tenant_id: tenantId });
      toast.success(`${tab === 'clientes' ? 'Cliente' : 'Proveedor'} creado`);
    }

    setShowForm(false);
    if (tab === 'clientes') {
      qc.invalidateQueries({ queryKey: ['customers', tenantId] });
    } else {
      setSuppliersLoaded(false);
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Clientes y Proveedores</h1>
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo {tab === 'clientes' ? 'Cliente' : 'Proveedor'}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setSearch(''); }}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="clientes" className="flex-1 sm:flex-none text-xs sm:text-sm">Clientes ({customers.length})</TabsTrigger>
            <TabsTrigger value="proveedores" className="flex-1 sm:flex-none text-xs sm:text-sm">Proveedores ({suppliers.length})</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, teléfono o cédula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          <TabsContent value="clientes" className="mt-4">
            <ContactList data={filtered} onEdit={openEdit} />
          </TabsContent>
          <TabsContent value="proveedores" className="mt-4">
            <ContactList data={filtered} onEdit={openEdit} />
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Nuevo'} {tab === 'clientes' ? 'Cliente' : 'Proveedor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre Completo *</Label><Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div className="form-grid">
                <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><Label>Cédula</Label><Input value={form.cedula} onChange={(e) => setForm(f => ({ ...f, cedula: e.target.value }))} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

/* ── Mobile-friendly contact list ── */
function ContactList({ data, onEdit }: { data: any[]; onEdit: (item: any) => void }) {
  if (data.length === 0) {
    return (
      <div className="empty-state">
        <Users className="empty-state-icon" />
        <p className="text-sm">No se encontraron registros</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Nombre</TableHead>
              <TableHead className="text-xs">Teléfono</TableHead>
              <TableHead className="text-xs">Cédula</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item: any) => (
              <TableRow key={item.id} className="table-row-hover cursor-pointer" onClick={() => onEdit(item)}>
                <TableCell className="font-medium text-sm">{item.full_name}</TableCell>
                <TableCell className="text-sm">{item.phone || '—'}</TableCell>
                <TableCell className="text-sm">{item.cedula || '—'}</TableCell>
                <TableCell className="text-sm hidden md:table-cell">{item.email || '—'}</TableCell>
                <TableCell><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {data.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onEdit(item)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {item.phone || item.cedula || item.email || '—'}
              </p>
            </div>
            <Edit2 className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}
