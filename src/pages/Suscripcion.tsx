import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, MessageCircle, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  activa: { label: 'Activa', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  suspendida: { label: 'Suspendida', variant: 'destructive' },
};

export default function Suscripcion() {
  const { tenant } = useAuth();

  const status = tenant?.subscription_status || 'pendiente';
  const plan = tenant?.subscription_plan || 'mensual';
  const fee = tenant?.monthly_fee || 1000;
  const nextDue = tenant?.next_due_date;
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.pendiente;

  const daysUntilDue = nextDue ? differenceInDays(parseISO(nextDue), new Date()) : null;

  const whatsappUrl = `https://wa.me/18495373577?text=${encodeURIComponent(
    `Hola, mi tienda es ${tenant?.name || '[NombreDelTenant]'}. Aquí adjunto mi recibo de pago para activar/renovar el sistema.`
  )}`;

  return (
    <Layout>
      <div className="page-container max-w-3xl mx-auto">
        <div className="section-header">
          <h1 className="page-title">Mi Suscripción</h1>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge variant={statusInfo.variant} className="mt-0.5">{statusInfo.label}</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Próximo Corte</p>
                <p className="text-sm font-semibold mt-0.5">
                  {nextDue ? format(parseISO(nextDue), "d 'de' MMMM, yyyy", { locale: es }) : 'No definido'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cuota Mensual</p>
                <p className="text-sm font-semibold mt-0.5">RD${fee.toLocaleString()}/mes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning if close to due date */}
        {daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                {daysUntilDue === 0
                  ? 'Tu suscripción vence HOY.'
                  : `Tu suscripción vence en ${daysUntilDue} día${daysUntilDue > 1 ? 's' : ''}.`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Realiza tu pago a tiempo para evitar interrupciones del servicio.</p>
            </div>
          </div>
        )}

        <Separator className="mb-6" />

        {/* Pricing Summary */}
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold">Resumen de Precios</h2>
          <div className="grid gap-3">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Licencia e Instalación (Pago Único)</p>
                <p className="text-2xl font-bold">$150 <span className="text-sm font-normal text-muted-foreground">USD</span></p>
                <p className="text-xs text-muted-foreground">O su equivalente en pesos dominicanos</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Primer Año</p>
                <p className="text-2xl font-bold">RD$1,000 <span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                <p className="text-xs text-muted-foreground">Opción anual: RD$10,000 (ahorras RD$2,000)</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">A partir del 2do Año</p>
                <p className="text-2xl font-bold">RD$1,800 <span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                <p className="text-xs text-muted-foreground">Descuento disponible al pagar el año completo</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* WhatsApp Payment */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">¿Necesitas pagar o renovar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Envía tu recibo de pago por WhatsApp para que activemos o renovemos tu suscripción.
            </p>
            <Button
              className="w-full sm:w-auto gap-2"
              size="lg"
              onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
            >
              <MessageCircle className="h-4 w-4" />
              Enviar Recibo de Pago
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Se abrirá WhatsApp con un mensaje pre-llenado con el nombre de tu tienda.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
