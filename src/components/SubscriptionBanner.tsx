import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { AlertTriangle, Clock, XCircle, MessageCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';

export function SubscriptionBanner() {
  const { tenant } = useAuth();
  const { isAdmin, isManager, isSuperAdmin } = useRole();

  // Only show to admin/manager roles (not super_admin, they manage globally)
  if (isSuperAdmin || (!isAdmin && !isManager)) return null;
  if (!tenant?.next_due_date) return null;
  // Lifetime plans never show subscription warnings
  if (tenant.subscription_plan === 'lifetime') return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = parseISO(tenant.next_due_date);
  dueDate.setHours(0, 0, 0, 0);
  const daysUntilDue = differenceInDays(dueDate, today);

  const whatsappUrl = `https://wa.me/18495373577?text=${encodeURIComponent(
    `Hola, mi tienda es ${tenant.name}. Aquí adjunto mi recibo de pago para activar/renovar el sistema.`
  )}`;

  // Suspended - past due
  if (daysUntilDue < 0 || tenant.subscription_status === 'suspendida') {
    return (
      <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-destructive text-sm font-medium">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>Tu suscripción está suspendida. El acceso está restringido hasta que se valide el pago.</span>
        </div>
        <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" asChild>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5" /> Reportar Pago
          </a>
        </Button>
      </div>
    );
  }

  // Due today
  if (daysUntilDue === 0) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-destructive text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Tu suscripción vence HOY. Por favor, reporta tu pago inmediatamente para mantener el servicio activo.</span>
        </div>
        <Button size="sm" variant="destructive" className="gap-1.5 shrink-0" asChild>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5" /> Reportar Pago
          </a>
        </Button>
      </div>
    );
  }

  // 3 days or less before due
  if (daysUntilDue <= 3) {
    return (
      <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
          <Clock className="h-4 w-4 shrink-0" />
          <span>Recordatorio: Tu suscripción vence en {daysUntilDue} día{daysUntilDue > 1 ? 's' : ''}. Realiza tu pago a tiempo para evitar interrupciones.</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10" asChild>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5" /> Enviar Recibo
          </a>
        </Button>
      </div>
    );
  }

  return null;
}
