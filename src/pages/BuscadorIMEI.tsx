import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useStore } from '@/hooks/useStore';
import { formatCurrency } from '@/lib/currency';
import { useRole } from '@/hooks/useRole';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Search, Smartphone, Package, Wrench, ShoppingCart, CreditCard } from 'lucide-react';

export default function BuscadorIMEI() {
  const { inventory, sales, repairs, loans } = useStore();
  const { canViewFinancials } = useRole();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query || query.length < 3) return null;
    const q = query.toLowerCase();

    const matchedInventory = inventory.filter(i => i.imei?.toLowerCase().includes(q) || i.serial?.toLowerCase().includes(q));
    const matchedSales = sales.filter(s => s.sale_items?.some(si => si.imei?.toLowerCase().includes(q)));
    const matchedRepairs = repairs.filter(r => r.imei?.toLowerCase().includes(q));
    const matchedLoans = loans.filter(l => l.imei?.toLowerCase().includes(q));

    return { inventory: matchedInventory, sales: matchedSales, repairs: matchedRepairs, loans: matchedLoans };
  }, [query, inventory, sales, repairs, loans]);

  const hasResults = results && (results.inventory.length + results.sales.length + results.repairs.length + results.loans.length) > 0;

  return (
    <Layout>
      <div className="page-container max-w-3xl mx-auto">
        <div className="section-header">
          <h1 className="page-title">Buscador IMEI</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ingresa un IMEI o número de serie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 text-base"
            autoFocus
          />
        </div>

        {query.length > 0 && query.length < 3 && (
          <p className="text-sm text-muted-foreground text-center">Ingresa al menos 3 caracteres</p>
        )}

        {results && !hasResults && (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 text-muted-foreground/30 mb-2" />
            No se encontraron resultados para "{query}"
          </div>
        )}

        {results && hasResults && (
          <div className="space-y-4">
            {/* Inventory */}
            {results.inventory.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Inventario ({results.inventory.length})</h3>
                  {results.inventory.map(item => (
                    <div key={item.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{item.product?.brand} {item.product?.name}</p>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">IMEI: <span className="font-mono">{item.imei}</span> · {item.product?.color} · {item.product?.capacity}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Condición: {item.condition}</span>
                        {item.battery_health && <span>Batería: {item.battery_health}%</span>}
                        <span>Precio: <strong className="text-foreground">{formatCurrency(item.sale_price)}</strong></span>
                        {canViewFinancials && <span>Costo: {formatCurrency(item.purchase_cost)}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sales */}
            {results.sales.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-primary" /> Ventas ({results.sales.length})</h3>
                  {results.sales.map(sale => (
                    <div key={sale.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{sale.customer_name}</p>
                        <span className="text-sm font-medium">{formatCurrency(sale.total_amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.sold_at).toLocaleDateString('es-DO')} · {sale.payment_method}
                      </p>
                      {sale.sale_items?.filter((si: any) => si.imei?.toLowerCase().includes(query.toLowerCase())).map((si: any) => (
                        <p key={si.id} className="text-xs text-muted-foreground">→ {si.brand} {si.model} · IMEI: <span className="font-mono">{si.imei}</span></p>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Repairs */}
            {results.repairs.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Reparaciones ({results.repairs.length})</h3>
                  {results.repairs.map(repair => (
                    <div key={repair.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{repair.brand} {repair.model}</p>
                        <Badge variant="outline" className="text-xs">{repair.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cliente: {repair.customer_name} · IMEI: <span className="font-mono">{repair.imei}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Falla: {repair.reported_fault}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Loans */}
            {results.loans.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Financiamientos ({results.loans.length})</h3>
                  {results.loans.map(loan => (
                    <div key={loan.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{loan.device_brand} {loan.device_model}</p>
                        <Badge variant="outline" className="text-xs">{loan.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cliente: {loan.customer_name} · Saldo: <strong>{formatCurrency(loan.balance_due)}</strong>
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
