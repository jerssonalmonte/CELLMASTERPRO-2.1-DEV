import {
  LayoutDashboard, Wrench, ShoppingCart, Package, Search, Users, ArrowLeftRight,
  CreditCard, FileText, BarChart3, Info, Settings, Shield, LogOut,
  Smartphone, ChevronLeft, Moon, Sun, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import useLocalStorage from '@/hooks/useLocalStorage';
import type { NavItem } from '@/types';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect } from 'react';

const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff', 'technician', 'super_admin'] },
  { title: 'Taller', url: '/taller', icon: Wrench, roles: ['admin', 'manager', 'staff', 'technician', 'super_admin'] },
  { title: 'Vender', url: '/vender', icon: ShoppingCart, roles: ['admin', 'manager', 'staff', 'super_admin'] },
  { title: 'Inventario', url: '/inventario', icon: Package, roles: ['admin', 'manager', 'staff', 'super_admin'] },
  { title: 'Buscador IMEI', url: '/buscador-imei', icon: Search, roles: ['admin', 'manager', 'staff', 'super_admin'] },
  { title: 'Clientes', url: '/clientes', icon: Users, roles: ['admin', 'manager', 'staff', 'super_admin'] },
  { title: 'Trade-In', url: '/trade-in', icon: ArrowLeftRight, roles: ['admin', 'manager', 'super_admin'] },
  { title: 'Financiamientos', url: '/financiamientos', icon: CreditCard, roles: ['admin', 'manager', 'super_admin'] },
  { title: 'Cuentas por Cobrar', url: '/cuentas-por-cobrar', icon: FileText, roles: ['admin', 'manager', 'super_admin'] },
  { title: 'Historial', url: '/reportes', icon: BarChart3, roles: ['admin', 'manager', 'super_admin'] },
  { title: 'Informe', url: '/informe', icon: Info, roles: ['admin', 'manager', 'super_admin'] },
  { title: 'Suscripción', url: '/suscripcion', icon: Sparkles, roles: ['admin', 'manager', 'staff', 'technician', 'super_admin'] },
  { title: 'Configuración', url: '/configuracion', icon: Settings, roles: ['admin', 'super_admin'] },
];

export function AppSidebar() {
  const { profile, tenant, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('theme', 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    staff: 'Vendedor',
    technician: 'Técnico',
    super_admin: 'Super Admin',
  };

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5 px-1">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-9 shrink-0 rounded-lg object-cover shadow-sm" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm animate-pulse-glow">
              <Smartphone className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col min-w-0 animate-fade-in">
              <span className="text-sm font-bold text-foreground tracking-tight truncate">{tenant?.name || 'Mi Negocio'}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border mx-3" />

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 px-3 mb-1">
              Menú Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === '/'}
                            className="flex items-center justify-center rounded-lg p-2 text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            activeClassName="bg-primary/10 text-primary font-medium"
                          >
                            <item.icon className="h-4.5 w-4.5 shrink-0" />
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Separator className="bg-sidebar-border mx-3" />

      {/* Theme toggle */}
      <div className="px-3 py-2">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={collapsed ? 'w-full' : 'w-full justify-start gap-2 text-xs'}
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && (theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro')}
        </Button>
      </div>

      <Separator className="bg-sidebar-border mx-3" />

      <SidebarFooter className="p-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <button
            onClick={() => navigate('/perfil')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground shadow-sm transition-transform hover:scale-105"
          >
            {initials}
          </button>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden min-w-0 animate-fade-in">
              <span className="truncate text-sm font-medium text-foreground">{profile?.full_name}</span>
              <span className="truncate text-[11px] text-muted-foreground">{roleLabels[role] || role}</span>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={signOut} title="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
