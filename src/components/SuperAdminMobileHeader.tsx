import { useState } from 'react';
import {
  Crown, Menu, X, LayoutDashboard, Building2, Users, CreditCard,
  BarChart3, Settings, LogOut, CalendarDays, Target, Receipt,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminNotificationBell } from '@/components/AdminNotificationBell';
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

export function SuperAdminMobileHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (url: string) =>
    url === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(url);

  const currentPage = ADMIN_NAV.find(n => isActive(n.url))?.title || 'Admin';

  return (
    <>
      <header className="sticky top-0 z-50 flex md:hidden h-14 items-center gap-3 border-b border-white/[0.06] bg-[hsl(220,20%,7%)]/95 backdrop-blur-sm px-4">
        <button onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Crown className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-50">{currentPage}</span>
        </div>
        <AdminNotificationBell />
      </header>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-[280px] bg-[hsl(220,20%,6%)] border-r border-white/[0.06] flex flex-col md:hidden animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700">
                  <Crown className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-slate-50">CellMaster Pro</span>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mx-5 h-px bg-white/[0.06]" />

            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {ADMIN_NAV.map((item) => {
                const active = isActive(item.url);
                return (
                  <button
                    key={item.url}
                    onClick={() => { navigate(item.url); setOpen(false); }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    )}
                  >
                    <item.icon className={cn('h-[18px] w-[18px]', active ? 'text-blue-400' : 'text-slate-500')} />
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mx-5 h-px bg-white/[0.06]" />

            <div className="px-4 py-4">
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
