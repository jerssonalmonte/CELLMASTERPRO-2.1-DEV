import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Edit2, Trash2, Ban, CheckCircle, Save, FileText, AlertTriangle, Upload, ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useLowStockThreshold } from '@/hooks/useLowStockThreshold';
import { isPasswordStrong } from '@/lib/passwordValidation';
import { PasswordChecklist } from '@/components/PasswordChecklist';
import type { AppRole } from '@/types';

const db = supabase as any;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  staff: 'Vendedor',
  technician: 'Técnico',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-destructive/10 text-destructive',
  admin: 'bg-primary/10 text-primary',
  manager: 'bg-status-process-bg text-status-process',
  staff: 'bg-status-ok-bg text-status-ok',
  technician: 'bg-status-waiting-bg text-status-waiting',
};

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  phone: string;
  role: AppRole;
  role_id: string;
  banned: boolean;
}

export default function Configuracion() {
  const { profile, user, tenant } = useAuth();
  const { isSuperAdmin, isAdmin } = useRole();
  const tenantId = profile?.tenant_id;
  const { threshold: lowStockThreshold, setThreshold: setLowStockThreshold } = useLowStockThreshold();
  const [thresholdInput, setThresholdInput] = useState(String(lowStockThreshold));
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('staff');
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [banTarget, setBanTarget] = useState<TeamMember | null>(null);

  // Warranty text
  const [warrantyText, setWarrantyText] = useState('');
  const [savingWarranty, setSavingWarranty] = useState(false);

  // Logo upload
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant?.logo_url || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: '', password: '', full_name: '', role: 'staff' as AppRole,
  });

  useEffect(() => {
    if (tenant?.warranty_text !== undefined) {
      setWarrantyText(tenant.warranty_text || '');
    }
  }, [tenant?.warranty_text]);

  useEffect(() => {
    if (tenant?.logo_url !== undefined) {
      setLogoPreview(tenant.logo_url || null);
    }
  }, [tenant?.logo_url]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2MB');
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `${tenantId}/logo.${ext}`;

    // Remove old logo if exists
    await supabase.storage.from('org-logos').remove([path]);

    const { error: uploadError } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error('Error al subir el logo');
      setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(path);
    const publicUrl = urlData.publicUrl + '?t=' + Date.now();

    const { error: updateError } = await db.from('tenants').update({ logo_url: publicUrl }).eq('id', tenantId);
    setUploadingLogo(false);
    if (updateError) {
      toast.error('Error al guardar el logo');
    } else {
      setLogoPreview(publicUrl);
      toast.success('Logo actualizado correctamente');
      window.location.reload();
    }
  };

  const handleRemoveLogo = async () => {
    if (!tenantId) return;
    setUploadingLogo(true);
    // List and remove files in the tenant folder
    const { data: files } = await supabase.storage.from('org-logos').list(tenantId);
    if (files && files.length > 0) {
      await supabase.storage.from('org-logos').remove(files.map(f => `${tenantId}/${f.name}`));
    }
    await db.from('tenants').update({ logo_url: null }).eq('id', tenantId);
    setLogoPreview(null);
    setUploadingLogo(false);
    toast.success('Logo eliminado');
    window.location.reload();
  };

  const loadMembers = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data: profiles } = await db.from('profiles').select('*').eq('tenant_id', tenantId);
    const { data: roles } = await db.from('user_roles').select('*').eq('tenant_id', tenantId);

    if (profiles && roles) {
      const team: TeamMember[] = profiles.map((p: any) => {
        const userRole = roles.find((r: any) => r.user_id === p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          username: p.username || '',
          phone: p.phone || '',
          role: userRole?.role || 'staff',
          role_id: userRole?.id || '',
          banned: false,
        };
      });
      setMembers(team);
    }
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, [tenantId]);

  const handleSaveWarranty = async () => {
    if (!tenantId) return;
    setSavingWarranty(true);
    const { error } = await db.from('tenants').update({ warranty_text: warrantyText }).eq('id', tenantId);
    setSavingWarranty(false);
    if (error) {
      toast.error('Error al guardar la garantía');
      console.error('Warranty save error:', error);
    } else {
      // Force reload to update tenant in auth context so receipts use updated text
      toast.success('Texto de garantía actualizado');
      window.location.reload();
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.password || !inviteForm.full_name) {
      toast.error('Completa todos los campos');
      return;
    }
    if (!isPasswordStrong(inviteForm.password)) {
      toast.error('Corrige los requisitos de contraseña indicados abajo');
      return;
    }
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: { email: inviteForm.email, password: inviteForm.password, full_name: inviteForm.full_name, role: inviteForm.role, tenant_id: tenantId },
      });
      if (res.error) throw res.error;
      toast.success('Usuario creado exitosamente');
      setShowInvite(false);
      setInviteForm({ email: '', password: '', full_name: '', role: 'staff' });
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear usuario');
    }
  };

  const handleRoleChange = async () => {
    if (!editMember) return;
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'update_role', user_id: editMember.user_id, updates: { role: editRole } },
      });
      if (res.error) throw res.error;
      toast.success('Rol actualizado');
      setEditMember(null);
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar rol');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete', user_id: deleteTarget.user_id },
      });
      if (res.error) throw res.error;
      toast.success('Usuario eliminado');
      setDeleteTarget(null);
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar usuario');
    }
  };

  const handleToggleBan = async () => {
    if (!banTarget) return;
    const action = banTarget.banned ? 'unban' : 'ban';
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { action, user_id: banTarget.user_id },
      });
      if (res.error) throw res.error;
      toast.success(banTarget.banned ? 'Usuario desbloqueado' : 'Usuario bloqueado');
      setBanTarget(null);
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const isSelf = (m: TeamMember) => m.user_id === user?.id;

  return (
    <Layout>
      <div className="page-container">
        <div className="section-header">
          <h1 className="page-title">Configuración</h1>
        </div>

        <Tabs defaultValue="equipo" className="space-y-4">
          <TabsList>
            <TabsTrigger value="equipo">Equipo</TabsTrigger>
            <TabsTrigger value="factura">Facturación</TabsTrigger>
          </TabsList>

          <TabsContent value="factura" className="space-y-4">
            {/* Logo Upload */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Logo de la Organización
              </h3>
              <p className="text-xs text-muted-foreground">
                Este logo aparecerá en todas las facturas y recibos impresos. Tamaño máximo: 2MB.
              </p>
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="rounded-md border p-2 bg-background">
                    <img src={logoPreview} alt="Logo" className="h-16 max-w-[200px] object-contain" />
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild disabled={uploadingLogo}>
                        <span><Upload className="h-3.5 w-3.5" /> Cambiar</span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={handleRemoveLogo} disabled={uploadingLogo}>
                      <X className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-1.5" asChild disabled={uploadingLogo}>
                    <span><Upload className="h-3.5 w-3.5" /> {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              )}
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Texto de Garantía en Facturas
              </h3>
              <p className="text-xs text-muted-foreground">
                Este texto se imprimirá automáticamente en todas las facturas de venta.
              </p>
              <Textarea
                value={warrantyText}
                onChange={(e) => setWarrantyText(e.target.value)}
                rows={4}
                placeholder="Ej: Garantía de 30 días por defectos de fábrica..."
              />
              <Button onClick={handleSaveWarranty} disabled={savingWarranty} size="sm" className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                {savingWarranty ? 'Guardando...' : 'Guardar Garantía'}
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-status-waiting" /> Alerta de Stock Bajo
              </h3>
              <p className="text-xs text-muted-foreground">
                Recibirás alertas cuando un producto tenga menos de esta cantidad disponible.
              </p>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  type="number"
                  min="1"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(e.target.value)}
                  className="w-24"
                />
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const val = parseInt(thresholdInput) || 5;
                    setLowStockThreshold(val);
                    setThresholdInput(String(val));
                    toast.success(`Umbral de stock bajo: ${val} unidades`);
                  }}
                >
                  <Save className="h-3.5 w-3.5" /> Guardar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="equipo" className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowInvite(true)}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
          </Button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : members.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-sm">{member.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{member.username}</TableCell>
                  <TableCell className="text-sm">{member.phone || '—'}</TableCell>
                  <TableCell>
                    <span className={`status-badge ${ROLE_COLORS[member.role] || ''}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSelf(member) && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" title="Cambiar rol" onClick={() => { setEditMember(member); setEditRole(member.role); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" title={member.banned ? 'Desbloquear' : 'Bloquear'} onClick={() => setBanTarget(member)}>
                          {member.banned ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : <Ban className="h-3.5 w-3.5 text-amber-600" />}
                        </Button>
                        <Button variant="ghost" size="sm" title="Eliminar" onClick={() => setDeleteTarget(member)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && members.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay miembros</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Invite Dialog */}
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogContent>
            <DialogHeader><DialogTitle>Agregar Usuario</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre Completo *</Label><Input value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} /></div>
              <div><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div>
                <Label>Contraseña *</Label>
                <Input type="password" value={inviteForm.password} onChange={e => setInviteForm(f => ({ ...f, password: e.target.value }))} />
                <PasswordChecklist password={inviteForm.password} />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v as AppRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="staff">Vendedor</SelectItem>
                    <SelectItem value="technician">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
              <Button onClick={handleInvite}>Crear Usuario</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={!!editMember} onOpenChange={open => !open && setEditMember(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cambiar Rol — {editMember?.full_name}</DialogTitle></DialogHeader>
            <div>
              <Label>Nuevo Rol</Label>
              <Select value={editRole} onValueChange={v => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="staff">Vendedor</SelectItem>
                  <SelectItem value="technician">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMember(null)}>Cancelar</Button>
              <Button onClick={handleRoleChange}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar a {deleteTarget?.full_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente al usuario y todos sus datos asociados. No se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Ban/Unban Confirmation */}
        <AlertDialog open={!!banTarget} onOpenChange={open => !open && setBanTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {banTarget?.banned ? `¿Desbloquear a ${banTarget?.full_name}?` : `¿Bloquear a ${banTarget?.full_name}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {banTarget?.banned
                  ? 'El usuario podrá iniciar sesión nuevamente.'
                  : 'El usuario no podrá iniciar sesión hasta que sea desbloqueado.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleBan}>
                {banTarget?.banned ? 'Desbloquear' : 'Bloquear'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
