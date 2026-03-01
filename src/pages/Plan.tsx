import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Check, Smartphone, Wrench, ShoppingCart, Package, CreditCard, BarChart3,
  Users, FileText, Search, Shield, Barcode, Star, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

// ... keep existing code (FEATURES array)
const FEATURES = [
  { icon: ShoppingCart, title: 'Punto de Venta (POS)', desc: 'Sistema completo de facturación con ITBIS, lector de código de barras, precios mínimos y recibos impresos.' },
  { icon: Package, title: 'Inventario Inteligente', desc: 'Gestión de equipos por IMEI y accesorios por SKU/código de barras con alertas de stock bajo.' },
  { icon: Wrench, title: 'Taller de Reparaciones', desc: 'Tablero Kanban con seguimiento de estado, checklist de condición física y recibos de taller.' },
  { icon: CreditCard, title: 'Financiamientos', desc: 'Créditos con amortización francesa, períodos semanal/quincenal/mensual y liquidación anticipada.' },
  { icon: FileText, title: 'Cuentas por Cobrar', desc: 'Seguimiento de deudas con pagos parciales y estado de cada cuenta.' },
  { icon: BarChart3, title: 'Reportes y Análisis', desc: 'Gráficos de ventas, reparaciones e inventario con reimpresión de recibos.' },
  { icon: Users, title: 'Gestión de Clientes', desc: 'Base de datos de clientes con historial completo de transacciones.' },
  { icon: Search, title: 'Buscador IMEI 360°', desc: 'Historial completo de cada equipo: ventas, reparaciones, financiamientos.' },
  { icon: Barcode, title: 'Código de Barras', desc: 'Escáner USB/cámara y generación automática de códigos para facturación rápida.' },
  { icon: Shield, title: 'Multi-Tenant + Roles', desc: 'Aislamiento por organización con 5 roles: Super Admin, Admin, Gerente, Vendedor, Técnico.' },
];

function PlanContent() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Back link for unauthenticated users */}
      {!isLoggedIn && (
        <div className="mb-4">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      )}

      {/* Hero */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
          <Smartphone className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Sistema ERP para Tiendas de Celulares</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Todo lo que necesitas para{' '}
          <span className="gradient-text">gestionar tu negocio</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Administra ventas, inventario, taller, financiamientos y más desde una sola plataforma diseñada
          específicamente para tiendas de celulares y accesorios en República Dominicana.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} className="transition-all hover:border-primary/30 hover:shadow-md">
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

      <Card className="max-w-md mx-auto border-primary/40 shadow-lg">
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
    </div>
  );
}

export default function Plan() {
  const { user } = useAuth();

  if (user) {
    return (
      <Layout>
        <PlanContent />
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PlanContent />
    </div>
  );
}
