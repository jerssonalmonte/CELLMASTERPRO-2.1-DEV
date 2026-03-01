import React, { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Plus, Edit2, Building2, Users, Ban, Loader2, Trash2, ChevronDown, ChevronRight, Upload, ImageIcon, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useNavigate } from 'react-router-dom';
import { isPasswordStrong } from '@/lib/passwordValidation';
import { PasswordChecklist } from '@/components/PasswordChecklist';

const db = supabase as any;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Administrador', manager: 'Gerente', staff: 'Vendedor', technician: 'Técnico',
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500/10 text-red-400', admin: 'bg-amber-500/10 text-amber-400',
  manager: 'bg-blue-500/10 text-blue-400', staff: 'bg-emerald-500/10 text-emerald-400', technician: 'bg-purple-500/10 text-purple-400',
};

const initialOrgForm = { name: '', slug: '', adminName: '', adminEmail: '', adminPassword: '' };

export default function AdminOrganizaciones() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgForm, setOrgForm] = useState(initialOrgForm);
  const [creating, setCreating] = useState(false);
  const [editOrg, setEditOrg] = useState<any>(null);
  const [editOrgForm, setEditOrgForm] = useState({ name: '', slug: '' });
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState<string | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<any>(null);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [editUser, setEditUser] = useState<any>(null);
  const [editUserRole, setEditUserRole] = useState<AppRole>('staff');
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [addUserToOrg, setAddUserToOrg] = useState<any>(null);
  const [newUserForm, setNewUserForm] = useState({ fullName: '', email: '', password: '', role: 'admin' as string });
  const [addingUser, setAddingUser] = useState(false);
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();

  const loadTenants = async () => {
    const { data } = await db.from('tenants').select('*').order('created_at', { ascending: false });
    setTenants(data || []);
  };

  const loadUsers = async () => {
    const { data: profiles } = await db.from('profiles').select('*');
    const { data: roles } = await db.from('user_roles').select('*');
    const merged = (profiles || []).map((p: any) => {
      const userRole = (roles || []).find((r: any) => r.user_id === p.user_id);
      return { ...p, user_roles: userRole ? [{ role: userRole.role, tenant_id: userRole.tenant_id }] : [] };
    });
    setUsers(merged);
  };

  const uploadLogo = async (file: File, tenantId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${tenantId}/logo.${ext}`;
    const { error } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true });
    if (error) { toast.error('Error subiendo logo: ' + error.message); return null; }
    const { data: urlData } = supabase.storage.from('org-logos').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleLogoSelect = (file: File | null, type: 'new' | 'edit') => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'new') { setNewLogoFile(file); setNewLogoPreview(url); }
    else { setEditLogoFile(file); setEditLogoPreview(url); }
  };

  useEffect(() => {
    Promise.all([loadTenants(), loadUsers()]).then(() => setLoading(false));
  }, []);

  const toggleExpand = (tenantId: string) => {
    setExpandedOrgs(prev => {
      const next = new Set(prev);
      if (next.has(tenantId)) next.delete(tenantId); else next.add(tenantId);
      return next;
    });
  };

  const getUsersForTenant = (tenantId: string) => users.filter(u => u.tenant_id === tenantId);

  const handleCreateOrg = async () => {
    if (!orgForm.name || !orgForm.adminEmail || !orgForm.adminPassword || !orgForm.adminName) { toast.error('Completa nombre de organización, y datos del admin'); return; }
    if (!isPasswordStrong(orgForm.adminPassword)) { toast.error('Corrige los requisitos de contraseña indicados abajo'); return; }
    setCreating(true);
    try {
      const slug = orgForm.slug || orgForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const { data: existing } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
      if (existing) { toast.error(`Ya existe una organización con el slug "${slug}"`); setCreating(false); return; }
      const { data: tenantData, error: tenantError } = await db.from('tenants').insert({ name: orgForm.name, slug }).select().single();
      if (tenantError) throw tenantError;
      if (newLogoFile) {
        const logoUrl = await uploadLogo(newLogoFile, tenantData.id);
        if (logoUrl) await db.from('tenants').update({ logo_url: logoUrl }).eq('id', tenantData.id);
      }
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-user', {
        body: { email: orgForm.adminEmail, password: orgForm.adminPassword, full_name: orgForm.adminName, role: 'admin', tenant_id: tenantData.id },
      });
      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);
      toast.success(`Organización "${orgForm.name}" creada`);
      setShowOrgForm(false); setOrgForm(initialOrgForm); setNewLogoFile(null); setNewLogoPreview(null);
      await Promise.all([loadTenants(), loadUsers()]);
    } catch (err: any) { toast.error(err.message || 'Error al crear organización'); } finally { setCreating(false); }
  };

  const handleEditOrg = async () => {
    if (!editOrg || !editOrgForm.name) return;
    const updates: any = { name: editOrgForm.name, slug: editOrgForm.slug };
    if (editLogoFile) { const logoUrl = await uploadLogo(editLogoFile, editOrg.id); if (logoUrl) updates.logo_url = logoUrl; }
    const { error } = await db.from('tenants').update(updates).eq('id', editOrg.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Organización actualizada'); setEditOrg(null); setEditLogoFile(null); setEditLogoPreview(null); loadTenants();
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrg) return;
    const tenantUsers = users.filter(u => u.tenant_id === deleteOrg.id);
    for (const u of tenantUsers) { try { await supabase.functions.invoke('manage-user', { body: { action: 'delete', user_id: u.user_id } }); } catch {} }
    const { error } = await db.from('tenants').delete().eq('id', deleteOrg.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Organización eliminada'); setDeleteOrg(null); await Promise.all([loadTenants(), loadUsers()]);
  };

  const toggleBlock = async (tenant: any) => {
    const blocked = tenant.blocked_at ? null : new Date().toISOString();
    await db.from('tenants').update({ blocked_at: blocked }).eq('id', tenant.id);
    toast.success(blocked ? 'Organización bloqueada' : 'Organización desbloqueada'); loadTenants();
  };

  const handleEditUserRole = async () => {
    if (!editUser) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', { body: { action: 'update_role', user_id: editUser.user_id, updates: { role: editUserRole } } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast.success('Rol actualizado'); setEditUser(null); loadUsers();
    } catch (err: any) { toast.error(err.message || 'Error al cambiar rol'); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', { body: { action: 'delete', user_id: deleteUser.user_id } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast.success('Usuario eliminado'); setDeleteUser(null); loadUsers();
    } catch (err: any) { toast.error(err.message || 'Error al eliminar usuario'); }
  };

  const handleAddUserToOrg = async () => {
    if (!addUserToOrg || !newUserForm.fullName || !newUserForm.email || !newUserForm.password) { toast.error('Completa todos los campos obligatorios'); return; }
    if (!isPasswordStrong(newUserForm.password)) { toast.error('Corrige los requisitos de contraseña indicados abajo'); return; }
    setAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', { body: { email: newUserForm.email, password: newUserForm.password, full_name: newUserForm.fullName, role: newUserForm.role, tenant_id: addUserToOrg.id } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast.success(`Usuario "${newUserForm.fullName}" creado en ${addUserToOrg.name}`);
      setAddUserToOrg(null); setNewUserForm({ fullName: '', email: '', password: '', role: 'admin' }); loadUsers();
    } catch (err: any) { toast.error(err.message || 'Error al crear usuario'); } finally { setAddingUser(false); }
  };

  const handleImpersonate = (tenant: any) => {
    startImpersonation(tenant.id, tenant.name);
    navigate('/');
  };

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-50">Organizaciones</h1>
            <p className="text-sm text-slate-400 mt-0.5">Gestiona todas las organizaciones de la plataforma</p>
          </div>
          <Button onClick={() => setShowOrgForm(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-9 text-[13px]">
            <Plus className="mr-1.5 h-4 w-4" /> Nueva Organización
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Total Organizaciones</p>
            <p className="text-lg font-bold text-amber-50 mt-0.5 tabular-nums">{tenants.length}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Total Usuarios</p>
            <p className="text-lg font-bold text-amber-400 mt-0.5 tabular-nums">{users.length}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-4">
            <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Bloqueadas</p>
            <p className="text-lg font-bold text-red-400 mt-0.5 tabular-nums">{tenants.filter(t => t.blocked_at).length}</p>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(228,22%,9%)] hover:bg-[hsl(228,22%,9%)]">
                <TableHead className="w-8 text-slate-500"></TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Nombre</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden md:table-cell">Slug</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Usuarios</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden sm:table-cell">Creado</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Estado</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </TableCell></TableRow>
              ) : tenants.map(t => {
                const orgUsers = getUsersForTenant(t.id);
                const isExpanded = expandedOrgs.has(t.id);
                return (
                  <React.Fragment key={t.id}>
                    <TableRow className="cursor-pointer hover:bg-white/[0.02] border-white/[0.04]" onClick={() => toggleExpand(t.id)}>
                      <TableCell className="w-8 px-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                      </TableCell>
                      <TableCell className="font-medium text-[13px] text-slate-200">
                        <div className="flex items-center gap-2.5">
                          {t.logo_url ? (
                            <img src={t.logo_url} alt="" className="h-7 w-7 rounded-md object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-amber-400" />
                            </div>
                          )}
                          <span className="truncate">{t.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-slate-500 font-mono hidden md:table-cell">{t.slug}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] bg-white/[0.04] text-slate-400 font-medium">{orgUsers.length}</Badge>
                      </TableCell>
                      <TableCell className="text-[13px] text-slate-400 tabular-nums hidden sm:table-cell">{new Date(t.created_at).toLocaleDateString('es-DO')}</TableCell>
                      <TableCell>
                        {t.blocked_at
                          ? <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>
                          : <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-[10px]">Activo</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" onClick={() => handleImpersonate(t)} title="Ver como admin">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]" onClick={() => { setEditOrg(t); setEditOrgForm({ name: t.name, slug: t.slug }); setEditLogoPreview(t.logo_url || null); setEditLogoFile(null); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]" onClick={() => toggleBlock(t)}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/70 hover:text-red-400 hover:bg-red-500/10" onClick={() => setDeleteOrg(t)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${t.id}-users`}>
                        <TableCell colSpan={7} className="p-0 bg-white/[0.015]">
                          <div className="px-4 sm:px-6 py-3">
                            <div className="flex items-center justify-between mb-2.5">
                              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Users className="h-3 w-3" /> Usuarios de {t.name}
                              </p>
                              <Button size="sm" variant="outline" className="h-7 text-[11px] border-white/[0.08] text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20" onClick={() => { setAddUserToOrg(t); setNewUserForm({ fullName: '', email: '', password: '', role: 'admin' }); }}>
                                <Plus className="h-3 w-3 mr-1" /> Agregar
                              </Button>
                            </div>
                            {orgUsers.length === 0 ? (
                              <p className="text-[13px] text-slate-500 py-3 text-center">No hay usuarios en esta organización</p>
                            ) : (
                              <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-white/[0.02] hover:bg-white/[0.02]">
                                      <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Nombre</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold hidden sm:table-cell">Usuario</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold hidden md:table-cell">Teléfono</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Rol</TableHead>
                                      <TableHead className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold text-right">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {orgUsers.map((u: any) => {
                                      const role = u.user_roles?.[0]?.role || 'staff';
                                      return (
                                        <TableRow key={u.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                                          <TableCell className="text-[13px] font-medium text-slate-200">{u.full_name}</TableCell>
                                          <TableCell className="text-[13px] text-slate-500 font-mono hidden sm:table-cell">{u.username || '—'}</TableCell>
                                          <TableCell className="text-[13px] text-slate-400 hidden md:table-cell">{u.phone || '—'}</TableCell>
                                          <TableCell>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[role] || ''}`}>
                                              {ROLE_LABELS[role] || role}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex justify-end gap-0.5">
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-300" onClick={() => { setEditUser(u); setEditUserRole(role as AppRole); }}>
                                                <Edit2 className="h-3 w-3" />
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/70 hover:text-red-400" onClick={() => setDeleteUser(u)}>
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Create Org Dialog */}
        <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Nueva Organización</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Datos de la tienda</p>
              <div className="grid gap-3">
                <div><Label>Nombre *</Label><Input value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} placeholder="CellMaster Centro" /></div>
                <div><Label>Slug</Label><Input value={orgForm.slug} onChange={e => setOrgForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generado" /></div>
                <div>
                  <Label>Logo de la organización</Label>
                  <div className="flex items-center gap-3 mt-1">
                    {newLogoPreview ? (
                      <img src={newLogoPreview} alt="Logo" className="h-14 w-14 rounded-lg object-cover border border-border" />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-muted transition-colors text-sm">
                      <Upload className="h-4 w-4" /> Subir logo
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoSelect(e.target.files?.[0] || null, 'new')} />
                    </label>
                  </div>
                </div>
              </div>
              <hr className="border-border" />
              <p className="text-sm font-medium text-muted-foreground">Usuario Admin</p>
              <div className="grid gap-3">
                <div><Label>Nombre completo *</Label><Input value={orgForm.adminName} onChange={e => setOrgForm(f => ({ ...f, adminName: e.target.value }))} /></div>
                <div><Label>Email *</Label><Input type="email" value={orgForm.adminEmail} onChange={e => setOrgForm(f => ({ ...f, adminEmail: e.target.value }))} /></div>
                <div>
                  <Label>Contraseña *</Label>
                  <Input type="password" value={orgForm.adminPassword} onChange={e => setOrgForm(f => ({ ...f, adminPassword: e.target.value }))} />
                  <PasswordChecklist password={orgForm.adminPassword} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOrgForm(false)}>Cancelar</Button>
              <Button onClick={handleCreateOrg} disabled={creating} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear Organización
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Org Dialog */}
        <Dialog open={!!editOrg} onOpenChange={o => !o && setEditOrg(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Organización</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre</Label><Input value={editOrgForm.name} onChange={e => setEditOrgForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Slug</Label><Input value={editOrgForm.slug} onChange={e => setEditOrgForm(f => ({ ...f, slug: e.target.value }))} /></div>
              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-3 mt-1">
                  {editLogoPreview ? (
                    <img src={editLogoPreview} alt="Logo" className="h-14 w-14 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center border border-dashed border-border">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-muted transition-colors text-sm">
                    <Upload className="h-4 w-4" /> Cambiar logo
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleLogoSelect(e.target.files?.[0] || null, 'edit')} />
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOrg(null)}>Cancelar</Button>
              <Button onClick={handleEditOrg}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Org Confirm */}
        <AlertDialog open={!!deleteOrg} onOpenChange={o => !o && setDeleteOrg(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminarán todos los usuarios y datos de <strong>{deleteOrg?.name}</strong>. Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteOrg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit User Role */}
        <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Cambiar Rol — {editUser?.full_name}</DialogTitle></DialogHeader>
            <div>
              <Label>Nuevo Rol</Label>
              <Select value={editUserRole} onValueChange={v => setEditUserRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="staff">Vendedor</SelectItem>
                  <SelectItem value="technician">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={handleEditUserRole}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User */}
        <AlertDialog open={!!deleteUser} onOpenChange={o => !o && setDeleteUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminará permanentemente a <strong>{deleteUser?.full_name}</strong>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add User to Org */}
        <Dialog open={!!addUserToOrg} onOpenChange={o => !o && setAddUserToOrg(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Agregar Usuario — {addUserToOrg?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nombre completo *</Label><Input value={newUserForm.fullName} onChange={e => setNewUserForm(f => ({ ...f, fullName: e.target.value }))} /></div>
              <div><Label>Email *</Label><Input type="email" value={newUserForm.email} onChange={e => setNewUserForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div>
                <Label>Contraseña *</Label>
                <Input type="password" value={newUserForm.password} onChange={e => setNewUserForm(f => ({ ...f, password: e.target.value }))} />
                <PasswordChecklist password={newUserForm.password} />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={newUserForm.role} onValueChange={v => setNewUserForm(f => ({ ...f, role: v }))}>
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
              <Button variant="outline" onClick={() => setAddUserToOrg(null)}>Cancelar</Button>
              <Button onClick={handleAddUserToOrg} disabled={addingUser} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                {addingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear Usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}
