import {
  LayoutDashboard, Building2, Users, CreditCard, BarChart3, Settings, LogOut, Crown, CalendarDays, Target, Receipt,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const ADMIN_NAV = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Organizaciones', url: '/admin/organizaciones', icon: Building2 },
  { title: 'Usuarios', url: '/admin/usuarios', icon: Users },
  { title: 'Membresías', url: '/admin/membresias', icon: CreditCard },
  { title: 'Reportes', url: '/admin/reportes', icon: BarChart3 },
  { title: 'Prospectos', url: '/admin/prospectos', icon: Target },
  { title: 'Agenda', url: '/admin/agenda', icon: CalendarDays },
  { title: 'Gastos Opex', url: '/admin/gastos', icon: Receipt },
  { title: 'Configuración', url: '/admin/configuracion', icon: Settings },
];

export function SuperAdminSidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url: string) =>
    url === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(url);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'SA';

  return (
    <aside className="hidden md:flex h-screen w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[hsl(220,20%,6%)]">
      {/* Brand header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-bold tracking-tight text-slate-50 leading-tight">CellMaster Pro</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/80">Platform Admin</span>
        </div>
      </div>

      <div className="mx-5 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.03] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-2 space-y-0.5">
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                 active
                   ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.15)]'
                   : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              )}
            >
              <item.icon className={cn(
                'h-[18px] w-[18px] shrink-0 transition-colors',
                active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'
              )} />
              <span>{item.title}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(37,99,235,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mx-5 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.03] to-transparent" />

      {/* Footer / profile */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[11px] font-bold text-white shadow-sm">
          {initials}
        </div>
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <span className="truncate text-sm font-medium text-slate-200 leading-tight">{profile?.full_name}</span>
          <span className="truncate text-[11px] text-blue-400/70">Super Admin</span>
        </div>
        <button
          onClick={signOut}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
