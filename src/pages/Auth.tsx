import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Smartphone, AlertCircle, Lock, ChevronRight, ShieldCheck, Check,
  ShoppingCart, Package, Wrench, CreditCard, BarChart3, Users, FileText,
  Search, Shield, Barcode, Star, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FEATURES = [
  { icon: ShoppingCart, title: 'Punto de Venta (POS)', desc: 'Sistema completo de facturación con ITBIS, lector de código de barras, precios mínimos y recibos impresos.' },
  { icon: Package, title: 'Inventario Inteligente', desc: 'Gestión de equipos por IMEI y productos por SKU/código de barras con alertas de stock bajo.' },
  { icon: Wrench, title: 'Taller de Reparaciones', desc: 'Tablero Kanban con seguimiento de estado, checklist de condición física y recibos de taller.' },
  { icon: CreditCard, title: 'Financiamientos', desc: 'Créditos con amortización francesa, períodos semanal/quincenal/mensual y liquidación anticipada.' },
  { icon: FileText, title: 'Cuentas por Cobrar', desc: 'Seguimiento de deudas con pagos parciales y estado de cada cuenta.' },
  { icon: BarChart3, title: 'Reportes y Análisis', desc: 'Gráficos de ventas, reparaciones e inventario con reimpresión de recibos.' },
  { icon: Users, title: 'Gestión de Clientes', desc: 'Base de datos de clientes con historial completo de transacciones.' },
  { icon: Search, title: 'Buscador IMEI 360°', desc: 'Historial completo de cada equipo: ventas, reparaciones, financiamientos.' },
  { icon: Barcode, title: 'Código de Barras', desc: 'Escáner USB/cámara y generación automática de códigos para facturación rápida.' },
  { icon: Shield, title: 'Multi-Tenant + Roles', desc: 'Aislamiento por organización con 5 roles: Super Admin, Admin, Gerente, Vendedor, Técnico.' },
];

function PlanSection() {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 pb-20 pt-8">
      {/* Features Grid */}
      <div className="text-center space-y-3 mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Todo lo que incluye <span className="gradient-text">Cell Master Pro</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
          Plataforma diseñada específicamente para tiendas de celulares y productos en República Dominicana.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {FEATURES.map((f) => (
          <Card key={f.title} className="transition-all hover:border-primary/30 hover:shadow-md bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-8" />

      {/* Pricing */}
      <div className="text-center space-y-3 mb-6">
        <h2 className="text-2xl font-bold">Plan Único</h2>
        <p className="text-muted-foreground">Sin límites de funciones. Todo incluido.</p>
      </div>

      <Card className="max-w-md mx-auto border-primary/40 shadow-lg bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              <Star className="h-3 w-3 mr-1" /> Recomendado
            </Badge>
          </div>
          <CardTitle className="text-xl">Licencia Completa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-1">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">$150</span>
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
            <p className="text-xs text-muted-foreground">O su equivalente en pesos · Pago único de licencia e instalación</p>
          </div>
          <Separator />
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Primer Año</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">RD$1,000</span>
              <span className="text-sm text-muted-foreground">/mes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Paga el año completo por solo <span className="font-semibold text-primary">RD$10,000</span> (ahorras RD$2,000)
            </p>
          </div>
          <Separator />
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">A partir del 2do año</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-3xl font-bold">RD$1,800</span>
              <span className="text-sm text-muted-foreground">/mes</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Descuento disponible al pagar el año completo
            </p>
          </div>
          <Separator />
          <ul className="space-y-2">
            {[
              'Acceso completo a todos los módulos',
              'Usuarios ilimitados',
              'Soporte técnico incluido',
              'Actualizaciones automáticas',
              'Respaldo de datos diario',
              'Personalización con logo y garantía',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button className="w-full" size="lg" asChild>
            <a href="https://wa.me/18495373577?text=Hola%2C%20me%20interesa%20la%20licencia%20de%20Cell%20Master%20Pro" target="_blank" rel="noopener noreferrer">
              Solicitar Licencia
            </a>
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Te contactaremos por WhatsApp para iniciar la configuración
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export default function Auth() {
  const { signIn, isAuthenticated, loading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleStart = () => {
    setTransitioning(true);
    setTimeout(() => setShowLogin(true), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let loginEmail = identifier.trim();
      if (!loginEmail.includes('@')) {
        const { data, error: rpcError } = await supabase.rpc('get_email_by_username', {
          _username: loginEmail,
        });
        if (rpcError || !data) {
          throw new Error('Usuario no encontrado');
        }
        loginEmail = data as string;
      }
      await signIn(loginEmail, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  };

  // Splash / Welcome Screen with Plan info below
  if (!showLogin) {
    return (
      <div className="min-h-screen bg-background overflow-y-auto relative">
        {/* Animated background orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[120px] animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-accent/10 blur-[120px] animate-[pulse_5s_ease-in-out_infinite_1s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/5 blur-[150px] animate-[pulse_6s_ease-in-out_infinite_0.5s]" />
        </div>

        {/* Floating particles */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/20"
              style={{
                width: `${4 + i * 2}px`,
                height: `${4 + i * 2}px`,
                left: `${15 + i * 14}%`,
                top: `${20 + (i % 3) * 25}%`,
                animation: `float-particle ${3 + i}s ease-in-out infinite ${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        {/* Hero section - full viewport */}
        <div className="flex min-h-screen items-center justify-center p-4 relative z-10">
          <div
            className={`flex flex-col items-center gap-8 transition-all duration-600 ${
              transitioning ? 'opacity-0 scale-95 translate-y-8' : 'opacity-100 scale-100'
            }`}
          >
            {/* Animated logo */}
            <div className="relative animate-fade-in">
              <div className="absolute inset-0 rounded-3xl bg-primary/30 blur-xl animate-[pulse_2s_ease-in-out_infinite]" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-accent shadow-2xl">
                <Smartphone className="h-12 w-12 text-primary-foreground animate-[bounce_3s_ease-in-out_infinite]" />
              </div>
            </div>

            <div className="text-center space-y-3">
              <h1
                className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground"
                style={{ animation: 'fade-in 0.6s ease-out 0.2s both' }}
              >
                Cell Master Pro
              </h1>
              <p
                className="text-muted-foreground text-base sm:text-lg max-w-xs mx-auto"
                style={{ animation: 'fade-in 0.6s ease-out 0.4s both' }}
              >
                Administra tu negocio de forma inteligente
              </p>
            </div>

            <div
              className="h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
              style={{ animation: 'fade-in 0.6s ease-out 0.5s both' }}
            />

            <div style={{ animation: 'fade-in 0.6s ease-out 0.6s both' }}>
              <Button
                onClick={handleStart}
                size="lg"
                className="group relative h-14 px-10 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-100"
              >
                <span className="flex items-center gap-3">
                  Iniciar Sistema
                  <ChevronRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </div>

            {/* Scroll indicator */}
            <div
              className="mt-4 flex flex-col items-center gap-1 text-muted-foreground/50"
              style={{ animation: 'fade-in 0.6s ease-out 1s both' }}
            >
              <span className="text-xs">Conoce más</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Plan section below hero */}
        <div className="relative z-10">
          <PlanSection />
        </div>

        <style>{`
          @keyframes float-particle {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
            25% { transform: translateY(-20px) translateX(10px); opacity: 0.7; }
            50% { transform: translateY(-35px) translateX(-5px); opacity: 0.5; }
            75% { transform: translateY(-15px) translateX(15px); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // Shared animated background
  const AnimatedBackground = () => (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Orbiting gradient blobs */}
      <div className="absolute h-[500px] w-[500px] rounded-full bg-primary/8 blur-[140px]" style={{ animation: 'orbit1 20s linear infinite', top: '10%', left: '20%' }} />
      <div className="absolute h-[400px] w-[400px] rounded-full bg-accent/8 blur-[130px]" style={{ animation: 'orbit2 25s linear infinite', bottom: '10%', right: '15%' }} />
      <div className="absolute h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" style={{ animation: 'orbit3 18s linear infinite', top: '50%', left: '50%' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + (i % 4) * 2}px`,
            height: `${2 + (i % 4) * 2}px`,
            background: i % 2 === 0 ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--accent) / 0.3)',
            left: `${8 + i * 7.5}%`,
            top: `${10 + ((i * 17) % 80)}%`,
            animation: `float-particle ${4 + (i % 5)}s ease-in-out infinite ${i * 0.4}s`,
          }}
        />
      ))}

      {/* Scanning line */}
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" style={{ animation: 'scan-line 8s ease-in-out infinite' }} />
    </div>
  );

  // Login form screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <AnimatedBackground />

      {/* Full-screen loading overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md" style={{ animation: 'fade-in 0.3s ease-out' }}>
          <div className="relative flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 h-20 w-20 rounded-full border-4 border-primary/20 animate-[ping_1.5s_ease-in-out_infinite]" />
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
                <ShieldCheck className="h-10 w-10 text-primary-foreground animate-[pulse_2s_ease-in-out_infinite]" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">Bienvenido a Cell Master Pro</p>
              <p className="text-sm text-muted-foreground">Verificando tus credenciales...</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-2 w-2 rounded-full bg-primary" style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <Card
        className="w-full max-w-sm border-border bg-card/80 backdrop-blur-sm shadow-lg relative"
        style={{ animation: 'fade-in 0.5s ease-out' }}
      >
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
            <Smartphone className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Cell Master Pro</CardTitle>
          <CardDescription className="text-muted-foreground">Ingresa tus credenciales para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email o Usuario</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="tu@email.com o tu_usuario"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Ingresando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Iniciar Sesión
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
