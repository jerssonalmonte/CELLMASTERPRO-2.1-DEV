import { useState, useEffect } from 'react';
import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', manager: 'Gerente', staff: 'Vendedor', technician: 'Técnico',
};
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500/10 text-red-400', admin: 'bg-amber-500/10 text-amber-400',
  manager: 'bg-blue-500/10 text-blue-400', staff: 'bg-emerald-500/10 text-emerald-400', technician: 'bg-purple-500/10 text-purple-400',
};

export default function AdminUsuarios() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      db.from('profiles').select('*'),
      db.from('user_roles').select('*'),
      db.from('tenants').select('id, name').order('name'),
    ]).then(([p, r, t]) => {
      setProfiles(p.data || []);
      setRoles(r.data || []);
      setTenants(t.data || []);
      setLoading(false);
    });
  }, []);

  const getUserRole = (userId: string) => {
    const r = roles.find((r: any) => r.user_id === userId);
    return r?.role || 'staff';
  };

  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || '—';

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.username?.toLowerCase().includes(search.toLowerCase());
    const matchTenant = filterTenant === 'all' || p.tenant_id === filterTenant;
    return matchSearch && matchTenant;
  });

  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-50">Usuarios</h1>
            <p className="text-sm text-slate-400 mt-0.5">Lista global de todos los usuarios de la plataforma</p>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium tabular-nums">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar por nombre o usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-[hsl(228,22%,9%)] border-white/[0.06] text-slate-200 placeholder:text-slate-500 focus-visible:ring-amber-500/30"
            />
          </div>
          <Select value={filterTenant} onValueChange={setFilterTenant}>
            <SelectTrigger className="w-full sm:w-[220px] h-10 bg-[hsl(228,22%,9%)] border-white/[0.06] text-slate-200">
              <SelectValue placeholder="Filtrar por organización" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las organizaciones</SelectItem>
              {tenants.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[hsl(228,22%,9%)] hover:bg-[hsl(228,22%,9%)]">
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Nombre</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Usuario</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold hidden sm:table-cell">Teléfono</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Organización</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Rol</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500">
                  <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                </TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-500 text-sm">No se encontraron usuarios</TableCell></TableRow>
              ) : filtered.map(p => {
                const role = getUserRole(p.user_id);
                return (
                  <TableRow key={p.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell className="text-[13px] font-medium text-slate-200">{p.full_name}</TableCell>
                    <TableCell className="text-[13px] text-slate-500 font-mono">{p.username || '—'}</TableCell>
                    <TableCell className="text-[13px] text-slate-400 hidden sm:table-cell">{p.phone || '—'}</TableCell>
                    <TableCell className="text-[13px] text-slate-300">{getTenantName(p.tenant_id)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[role] || ''}`}>
                        {ROLE_LABELS[role] || role}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
