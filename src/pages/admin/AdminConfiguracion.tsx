import { SuperAdminLayout } from '@/components/SuperAdminLayout';
import { Settings, Shield, Database, Server } from 'lucide-react';

const CONFIG_CARDS = [
  { icon: Settings, title: 'General', desc: 'Nombre de la plataforma, ajustes globales y parámetros del sistema.' },
  { icon: Shield, title: 'Seguridad', desc: 'Políticas de contraseñas, sesiones activas y control de acceso.' },
  { icon: Database, title: 'Base de Datos', desc: 'Estadísticas, mantenimiento y respaldos de la base de datos.' },
  { icon: Server, title: 'Infraestructura', desc: 'Estado de servicios, Edge Functions y monitoreo del sistema.' },
];

export default function AdminConfiguracion() {
  return (
    <SuperAdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-50">Configuración</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configuración global de la plataforma CellMaster Pro</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONFIG_CARDS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-xl border border-white/[0.06] bg-[hsl(228,22%,9%)] p-5 hover:border-amber-500/15 transition-colors cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/15 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-50">{title}</h3>
                  <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">{desc}</p>
                  <span className="inline-block mt-3 text-[11px] font-medium text-amber-500/60 uppercase tracking-wide">Próximamente</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
