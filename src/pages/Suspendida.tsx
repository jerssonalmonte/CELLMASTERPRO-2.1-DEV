import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageCircle, LogOut } from 'lucide-react';

export default function Suspendida() {
  const { tenant, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const whatsappUrl = `https://wa.me/18495373577?text=${encodeURIComponent(
    `Hola, mi tienda es ${tenant?.name || '[NombreDelTenant]'}. Aquí adjunto mi recibo de pago para activar/renovar el sistema.`
  )}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Cuenta Suspendida</h1>
          <p className="text-muted-foreground text-sm">
            La suscripción de <strong>{tenant?.name}</strong> está suspendida. 
            El acceso al sistema está restringido hasta que se valide el pago.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full gap-2" asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> Reportar Pago por WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="lg" className="w-full gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Cerrar Sesión
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Si ya realizaste tu pago, espera a que sea validado por el equipo de soporte.
        </p>
      </div>
    </div>
  );
}
