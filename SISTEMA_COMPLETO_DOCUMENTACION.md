# 📋 DOCUMENTACIÓN COMPLETA DEL SISTEMA ERP - TIENDA DE CELULARES
## Para Replicación en Otra Plataforma

---

## 1. VISIÓN GENERAL

**Tipo:** ERP SaaS Multi-Tenant para tiendas de celulares en República Dominicana.
**Idioma:** Español (interfaz completa).
**Moneda:** Pesos Dominicanos (RD$).
**Modelo de negocio:** Suscripción mensual por organización (tenant).

---

## 2. STACK TECNOLÓGICO ACTUAL

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui (Radix primitives) |
| Estado del servidor | TanStack React Query v5 |
| Routing | React Router DOM v6 |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| Seguridad DB | Row Level Security (RLS) por tenant_id |
| Edge Functions | Deno (TypeScript) |

---

## 3. ARQUITECTURA MULTI-TENANT

### Concepto
Cada organización (tienda) es un **tenant**. Todos los datos están aislados por `tenant_id`. Un usuario pertenece a exactamente un tenant.

### Sistema de Roles (RBAC)
5 niveles jerárquicos almacenados en tabla separada `user_roles`:

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `super_admin` | Dueño de la plataforma | Todo. Panel `/admin` separado. Gestión global. |
| `admin` | Dueño de tienda | Todo dentro de su tenant. Configuración. Usuarios. |
| `manager` | Gerente | Ventas, inventario, reportes, financiamientos, trade-in. |
| `staff` | Vendedor | Ventas, inventario (lectura), taller, clientes. |
| `technician` | Técnico | Solo taller (reparaciones asignadas). |

### Tipo Enum en DB
```sql
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'staff', 'technician');
```

---

## 4. ESQUEMA DE BASE DE DATOS

### 4.1 Tabla: `tenants`
Organizaciones/tiendas.
```sql
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  blocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  warranty_text TEXT DEFAULT 'Garantía de 30 días por defectos de fábrica. No cubre daños por agua, caídas o mal uso.',
  logo_url TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'pendiente', -- activa | pendiente | suspendida
  subscription_plan TEXT NOT NULL DEFAULT 'mensual',     -- mensual | anual
  monthly_fee NUMERIC NOT NULL DEFAULT 1000,
  next_due_date DATE
);
```

### 4.2 Tabla: `profiles`
Perfil de usuario vinculado a auth.users.
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- FK a auth.users(id)
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL DEFAULT '',
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 Tabla: `user_roles`
Roles separados del perfil (seguridad).
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- FK a auth.users(id)
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.4 Tabla: `products`
Catálogo de productos por tenant.
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,              -- Modelo (ej: "iPhone 15 Pro")
  brand TEXT NOT NULL DEFAULT '',  -- Marca (ej: "Apple")
  color TEXT NOT NULL DEFAULT '',
  capacity TEXT,                   -- Ej: "256GB"
  category TEXT NOT NULL DEFAULT 'celular', -- celular | accesorio | repuesto
  base_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.5 Tabla: `inventory_items`
Unidades individuales de inventario.
```sql
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  product_id UUID REFERENCES products(id),
  purchase_id UUID REFERENCES purchases(id),
  imei TEXT,
  serial TEXT,
  barcode TEXT,
  condition TEXT NOT NULL DEFAULT 'usado',  -- nuevo | usado
  grade TEXT,                               -- A | B | C
  battery_health INTEGER,                   -- 0-100%
  is_new BOOLEAN NOT NULL DEFAULT false,
  purchase_cost NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  min_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'disponible', -- disponible | vendido | reservado
  quantity INTEGER NOT NULL DEFAULT 1,
  seller_name TEXT,
  seller_cedula TEXT,
  seller_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.6 Tabla: `customers`
Clientes por tenant.
```sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL,
  phone TEXT,
  cedula TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.7 Tabla: `suppliers`
Proveedores por tenant.
```sql
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  cedula TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.8 Tabla: `sales`
Ventas.
```sql
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  customer_cedula TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_received NUMERIC NOT NULL DEFAULT 0,
  change_given NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo', -- efectivo | transferencia | tarjeta
  reference_number TEXT,
  notes TEXT,
  sold_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
);
```

### 4.9 Tabla: `sale_items`
Ítems de cada venta.
```sql
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  imei TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);
```

### 4.10 Tabla: `purchases`
Compras/Trade-In a proveedores.
```sql
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  supplier_name TEXT NOT NULL DEFAULT '',
  supplier_cedula TEXT,
  supplier_phone TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  reference_number TEXT,
  notes TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
```

### 4.11 Tabla: `repairs`
Taller de reparaciones.
```sql
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  imei TEXT,
  color TEXT,
  lock_code TEXT,
  reported_fault TEXT NOT NULL DEFAULT '',
  checklist JSONB NOT NULL DEFAULT '{}',
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  parts_cost NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  advance NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'recibido',
  -- Estados: recibido | diagnosticando | espera_pieza | en_proceso | en_prueba | listo | entregado | no_se_pudo
  technician_notes TEXT,
  notes TEXT,
  assigned_to UUID,  -- user_id del técnico asignado
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Checklist JSON structure:**
```json
{
  "brokenScreen": false,
  "scratchedBack": false,
  "noDisplay": false,
  "sunkenButtons": false,
  "missingParts": false,
  "waterDamage": false,
  "crackedBack": false,
  "chargerPortDamage": false
}
```

### 4.12 Tabla: `loans`
Financiamientos/Préstamos.
```sql
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  sale_id UUID REFERENCES sales(id),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_cedula TEXT,
  device_brand TEXT NOT NULL DEFAULT '',
  device_model TEXT NOT NULL DEFAULT '',
  imei TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  financed_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_rate NUMERIC NOT NULL DEFAULT 0,
  installments INTEGER NOT NULL DEFAULT 1,
  monthly_payment NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'activo', -- activo | al_dia | atrasado | liquidado | cancelado
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  liquidated_at TIMESTAMPTZ,
  payment_period TEXT NOT NULL DEFAULT 'monthly', -- weekly | biweekly | monthly
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.13 Tabla: `loan_installments`
Cuotas de cada préstamo.
```sql
CREATE TABLE public.loan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  loan_id UUID NOT NULL REFERENCES loans(id),
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  interest_amount NUMERIC NOT NULL DEFAULT 0,
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  scheduled_payment NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_early_payment BOOLEAN DEFAULT false,
  payment_notes TEXT
);
```

### 4.14 Tabla: `accounts_receivable`
Cuentas por cobrar.
```sql
CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES customers(id),
  sale_id UUID REFERENCES sales(id),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT,
  customer_cedula TEXT,
  description TEXT NOT NULL DEFAULT '',
  device_brand TEXT,
  device_model TEXT,
  imei TEXT,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | parcial | pagado
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.15 Tabla: `ar_payments`
Pagos a cuentas por cobrar.
```sql
CREATE TABLE public.ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ar_id UUID NOT NULL REFERENCES accounts_receivable(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'efectivo',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
```

---

## 5. FUNCIONES DE BASE DE DATOS (Security Definer)

```sql
-- Verificar si un usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Verificar si un usuario es super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

-- Verificar acceso a un tenant
CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id);
$$;

-- Verificar si es admin o superior en un tenant
CREATE OR REPLACE FUNCTION public.is_admin_or_above(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role IN ('super_admin', 'admin')
  );
$$;

-- Verificar si es manager o superior en un tenant
CREATE OR REPLACE FUNCTION public.is_manager_or_above(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role IN ('super_admin', 'admin', 'manager')
  );
$$;

-- Obtener tenant_id de un usuario
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Obtener email por username
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.email FROM auth.users u
  INNER JOIN public.profiles p ON p.user_id = u.id
  WHERE lower(p.username) = lower(_username) LIMIT 1;
$$;

-- Auto-crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant_id UUID;
  _full_name TEXT;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  
  IF _tenant_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, tenant_id, full_name, first_name, last_name, username)
    VALUES (
      NEW.id, _tenant_id, _full_name,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(_full_name, ' ', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(_full_name, ' ', 2)),
      COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    -- Siempre asignar 'staff'. Cambios de rol van por edge function.
    INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (NEW.id, _tenant_id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger: crear perfil automáticamente al registrar usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Proteger campos de suscripción (solo super_admin puede cambiarlos)
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.monthly_fee := OLD.monthly_fee;
    NEW.next_due_date := OLD.next_due_date;
  END IF;
  RETURN NEW;
END;
$$;

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## 6. POLÍTICAS RLS (Row Level Security)

### Patrón General
- **SELECT:** `has_tenant_access(auth.uid(), tenant_id) OR is_super_admin(auth.uid())`
- **INSERT:** `has_tenant_access(auth.uid(), tenant_id)`
- **UPDATE:** `has_tenant_access(auth.uid(), tenant_id)`
- **DELETE:** `is_manager_or_above(auth.uid(), tenant_id)`

### Tablas con acceso restringido a manager+
- `loans`, `accounts_receivable`, `ar_payments`, `loan_installments`
- Usan `is_manager_or_above()` para SELECT, INSERT, UPDATE, DELETE.

### Tabla `tenants`
- SELECT: `is_super_admin(auth.uid()) OR has_tenant_access(auth.uid(), id)`
- INSERT/DELETE: Solo `is_super_admin(auth.uid())`
- UPDATE: `is_admin_or_above(auth.uid(), id)` O `is_super_admin(auth.uid())`

### Tabla `user_roles`
- SELECT: `user_id = auth.uid() OR has_tenant_access(...) OR is_super_admin(...)`
- INSERT/UPDATE/DELETE: `is_admin_or_above(auth.uid(), tenant_id) AND user_id <> auth.uid() AND role <> 'super_admin'`
- Super admins: pueden todo excepto modificar su propio rol.

### Tabla `profiles`
- SELECT: `user_id = auth.uid() OR has_tenant_access(...) OR is_super_admin(...)`
- UPDATE: Solo `user_id = auth.uid()`
- INSERT/DELETE: No permitido desde cliente (manejado por trigger).

### Tabla `repairs`
- SELECT: `has_tenant_access(...) OR assigned_to = auth.uid() OR is_super_admin(...)`
- UPDATE: `has_tenant_access(...) OR assigned_to = auth.uid()`

---

## 7. EDGE FUNCTIONS (Backend Serverless)

### 7.1 `create-user`
**Propósito:** Crear usuarios con privilegios de Service Role (sin confirmación de email).
- **Autorización:** Solo admin+ puede invocar.
- **Validación:** Email, password (6-128 chars), full_name, tenant_id, role.
- **Protección:** Admins no pueden asignar `super_admin`. Solo pueden crear en su propio tenant.
- **Re-provisioning:** Si el usuario ya existe, actualiza contraseña, perfil y rol.

### 7.2 `manage-user`
**Propósito:** Gestionar usuarios existentes.
- **Acciones:** `delete`, `update_role`, `update_profile`, `ban`, `unban`.
- **Protección:** No puede modificarse a sí mismo. Admin no puede tocar super_admins.

### 7.3 `process-payment`
**Propósito:** Procesar pagos financieros en el servidor (evitar manipulación del cliente).
- **Acciones:**
  - `ar_payment` — Registrar abono a cuenta por cobrar.
  - `pay_installment` — Pagar cuota de préstamo.
  - `liquidate_loan` — Liquidar préstamo anticipadamente (solo capital).
- **Validaciones:** Montos, estados, permisos, cálculos de saldo.

### 7.4 `import-customers`
**Propósito:** Importación masiva de clientes.
- Recibe array de clientes con `tenant_id`.
- Deduplicación por `full_name + phone`.
- Inserta en lotes de 100.

---

## 8. STORAGE (Almacenamiento de Archivos)

### Buckets
| Bucket | Público | Uso |
|--------|---------|-----|
| `avatars` | Sí | Fotos de perfil de usuarios |
| `org-logos` | Sí | Logos de organizaciones |

---

## 9. MÓDULOS DEL FRONTEND

### 9.1 Rutas y Páginas

| Ruta | Componente | Roles | Descripción |
|------|-----------|-------|-------------|
| `/login` | Auth | Público | Login/Registro |
| `/` | Dashboard | Todos | Panel principal con KPIs |
| `/taller` | Taller | Todos | Kanban de reparaciones |
| `/vender` | Vender | admin,manager,staff | POS - punto de venta |
| `/inventario` | Inventario | admin,manager,staff | Gestión de inventario |
| `/buscador-imei` | BuscadorIMEI | admin,manager,staff | Búsqueda por IMEI |
| `/clientes` | Clientes | admin,manager,staff | Gestión de clientes |
| `/trade-in` | Compra | admin,manager | Compra de equipos usados |
| `/financiamientos` | Financiamientos | admin,manager | Préstamos y cuotas |
| `/cuentas-por-cobrar` | CuentasPorCobrar | admin,manager | Cuentas pendientes |
| `/reportes` | Reportes | admin,manager | Historial de ventas/compras |
| `/informe` | Informe | admin,manager | Informes financieros |
| `/configuracion` | Configuracion | admin | Config de la tienda |
| `/perfil` | Perfil | Todos | Perfil del usuario |
| `/suscripcion` | Suscripcion | Todos | Estado de suscripción |
| `/suspendida` | Suspendida | - | Pantalla de cuenta suspendida |

### Rutas Super Admin (`/admin/*`)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/admin` | SuperAdminDashboard | Dashboard global |
| `/admin/organizaciones` | AdminOrganizaciones | Gestión de tenants |
| `/admin/usuarios` | AdminUsuarios | Gestión global de usuarios |
| `/admin/membresias` | AdminMembresias | Gestión de suscripciones |
| `/admin/reportes` | AdminReportes | Reportes globales |
| `/admin/configuracion` | AdminConfiguracion | Config de plataforma |

### 9.2 Componentes Clave

- **Layout:** Sidebar colapsable + header sticky + contenido principal.
- **ProtectedRoute:** Verifica autenticación, rol, estado de suscripción.
- **SuperAdminRoute:** Solo permite acceso a super_admin.
- **AppSidebar:** Navegación filtrada por rol. Toggle dark/light mode.
- **AddInventoryDialog:** Formulario para agregar inventario con catálogo de dispositivos.
- **CustomerAutocomplete:** Búsqueda de clientes existentes con autocompletado.
- **BarcodeScanner:** Escáner de códigos de barras con cámara.
- **PrintReceipt:** Generación de recibos para impresión térmica (80mm).
- **ImpersonationBanner:** Banner cuando super_admin actúa como otro tenant.
- **SubscriptionBanner:** Aviso de suscripción pendiente.

### 9.3 Hook Principal: `useStore`
Centraliza TODAS las queries y mutations de datos:
- **Queries:** inventory, products, sales, purchases, repairs, customers, loans, arList
- **Mutations:** createSale, createPurchase, createRepair, updateRepair, createLoan, payInstallment, liquidateLoan, createAR, upsertCustomer
- Usa TanStack Query con `staleTime` configurado por entidad.
- Operaciones financieras delegadas a Edge Function `process-payment`.

### 9.4 Hook: `useAuth`
- Maneja sesión, perfil, tenant y rol del usuario.
- Listener `onAuthStateChange` + `getSession` inicial.
- Proporciona: `user`, `session`, `profile`, `tenant`, `role`, `loading`, `signIn`, `signUp`, `signOut`, `isAuthenticated`.

### 9.5 Hook: `useImpersonation`
- Permite a super_admin actuar como otro tenant via `localStorage`.
- Estados: `isImpersonating`, `impersonatedTenantId`, `impersonatedTenantName`.

### 9.6 Hook: `useRole`
- Derivado de `useAuth`.
- Proporciona flags: `isSuperAdmin`, `isAdmin`, `isManager`, `canViewFinancials`, `canEdit`, `canDelete`, `canExport`.

---

## 10. CATÁLOGO DE DISPOSITIVOS

Archivo estático `src/data/deviceCatalog.ts` con:
- **Apple:** iPhone 11 hasta iPhone 17 Pro Max (incluyendo Mini, Plus, Pro, SE, 16e, Air).
- **Samsung:** Galaxy S23/S24/S25 (+ Ultra), Galaxy A05/A15/A25/A35/A55.
- **Xiaomi:** Redmi Note 13, Redmi 13C, Xiaomi 14, Poco X6/M6.
- **Motorola:** Moto G34/G54/G84, Moto E14.

Cada dispositivo tiene: `brand`, `model`, `colors[]`, `storages[]`.

**Categorías de accesorios:** Cover/Funda, Protector, Cargador, Audífonos, Cable USB, Soporte, Power Bank, Memoria SD, Adaptador, Otro.

**Categorías de repuestos:** Baterías, Pantallas, Tapas Traseras, Cámaras, Flex de Carga, Altavoces, Micrófonos, Botones/Flex, Conectores, Marcos/Chasis, Cristal Trasero, Sensores, Otro.

---

## 11. SISTEMA DE DISEÑO (UI/UX)

### Tema
- **Dark mode por defecto** con soporte para light mode.
- Font: Inter (Google Fonts).
- Border radius: 0.75rem.
- Colores principales (HSL):
  - Primary: `212 100% 56%` (azul)
  - Accent: `260 60% 55%` (púrpura)
  - Success: `152 60% 48%` (verde)
  - Warning: `38 95% 55%` (ámbar)
  - Destructive: `0 72% 55%` (rojo)

### Componentes CSS Custom
- `.kpi-card` — Tarjeta de KPI con hover
- `.status-badge` — Badges de estado
- `.kanban-col` — Columna de kanban
- `.repair-card` — Tarjeta de reparación
- `.glass-card` — Efecto glass/blur
- `.gradient-text` — Texto con gradiente
- `.animate-fade-in`, `.animate-slide-in`, `.animate-shimmer`, `.animate-pulse-glow`

---

## 12. FLUJOS DE NEGOCIO PRINCIPALES

### 12.1 Venta (POS)
1. Seleccionar items del inventario disponible.
2. Buscar/crear cliente (autocompletado).
3. Calcular total, recibir pago, calcular cambio.
4. Método de pago: efectivo, transferencia, tarjeta.
5. Al confirmar: crear `sale` + `sale_items`, decrementar `inventory_items.quantity`, marcar como `vendido` si qty=0.
6. Generar recibo imprimible (80mm).

### 12.2 Registro de Inventario (Trade-In / Compra)
1. Datos del proveedor/vendedor.
2. Agregar items: marca, modelo, IMEI, color, capacidad, condición, grado, salud batería.
3. Costos: precio de compra, precio de venta sugerido.
4. Crear `purchase` + `products` (si no existe) + `inventory_items`.
5. Accesorios con mismos atributos se agrupan por cantidad.

### 12.3 Taller (Reparaciones)
1. Recibir equipo: datos del cliente, marca, modelo, IMEI, falla reportada, checklist físico.
2. Costos: mano de obra, piezas, anticipo.
3. Flujo Kanban: recibido → diagnosticando → espera_pieza → en_proceso → en_prueba → listo → entregado.
4. Estado alternativo: `no_se_pudo`.
5. Técnico asignado puede ver/editar sus reparaciones.

### 12.4 Financiamiento
1. Seleccionar venta o crear directamente.
2. Configurar: monto total, inicial, tasa mensual, cuotas, período (semanal/quincenal/mensual).
3. Sistema genera tabla de amortización automática.
4. Pagos de cuotas vía Edge Function `process-payment`.
5. Liquidación anticipada: paga solo el capital restante.

### 12.5 Cuentas por Cobrar
1. Crear cuenta con monto original y datos del cliente.
2. Abonos parciales vía Edge Function `process-payment`.
3. Estados automáticos: pendiente → parcial → pagado.

---

## 13. MODELO DE SUSCRIPCIÓN

- **Licencia e instalación:** $150 USD (pago único).
- **Primer año:** RD$1,000/mes o RD$10,000/año.
- **Segundo año en adelante:** RD$1,800/mes.
- **Validación:** Manual vía WhatsApp (+1 849 537 3577).
- **Estados:** activa, pendiente, suspendida.
- **Suspensión:** Redirige a `/suspendida`, bloquea acceso a funcionalidades.
- **Solo super_admin puede modificar** campos de suscripción (protegido por trigger).

---

## 14. SEGURIDAD

### Principios
1. **RLS en todas las tablas** — Aislamiento por tenant_id.
2. **Roles en tabla separada** — Nunca en profiles ni en localStorage.
3. **Edge Functions para operaciones críticas** — Pagos, creación de usuarios.
4. **Security Definer functions** — Evitan recursión RLS.
5. **Protección contra escalamiento de privilegios:**
   - No puedes cambiar tu propio rol.
   - Admin no puede asignar/eliminar super_admin.
   - Solo super_admin puede crear tenants.
6. **Trigger protege campos de suscripción** — Solo super_admin puede modificarlos.

---

## 15. MONEDA Y FORMATO

```typescript
// Formato de moneda
export function formatCurrency(amount: number): string {
  return `RD$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
```

---

## 16. ESTRUCTURA DE CARPETAS

```
src/
├── App.tsx                    # Router principal
├── main.tsx                   # Entry point
├── index.css                  # Tema y estilos globales
├── components/
│   ├── ui/                    # Componentes shadcn/ui (40+ componentes)
│   ├── Layout.tsx             # Layout principal con sidebar
│   ├── AppSidebar.tsx         # Sidebar con navegación por rol
│   ├── ProtectedRoute.tsx     # Guard de autenticación + rol
│   ├── SuperAdminRoute.tsx    # Guard para super_admin
│   ├── AddInventoryDialog.tsx # Diálogo de agregar inventario
│   ├── CustomerAutocomplete.tsx
│   ├── BarcodeScanner.tsx
│   ├── PrintReceipt.ts
│   ├── ImpersonationBanner.tsx
│   └── SubscriptionBanner.tsx
├── hooks/
│   ├── useAuth.tsx            # Contexto de autenticación
│   ├── useStore.ts            # Queries y mutations centralizadas
│   ├── useRole.ts             # Flags de permisos
│   ├── useImpersonation.ts    # Super admin impersonation
│   ├── useLocalStorage.ts
│   └── useLowStockThreshold.ts
├── pages/
│   ├── Auth.tsx, Dashboard.tsx, Taller.tsx, Vender.tsx, ...
│   └── admin/                 # Páginas de super admin
├── data/
│   └── deviceCatalog.ts       # Catálogo de dispositivos
├── lib/
│   ├── currency.ts            # Formato RD$
│   ├── utils.ts               # cn() utility
│   ├── sounds.ts              # Efectos de sonido
│   ├── safeScanner.ts         # Wrapper seguro para scanner
│   └── passwordValidation.ts
├── types/
│   └── index.ts               # Todos los tipos TypeScript
└── integrations/
    └── supabase/
        ├── client.ts          # Cliente Supabase configurado
        └── types.ts           # Tipos auto-generados de DB

supabase/
├── config.toml                # Config de edge functions
└── functions/
    ├── create-user/index.ts
    ├── manage-user/index.ts
    ├── process-payment/index.ts
    └── import-customers/index.ts
```

---

## 17. DEPENDENCIAS PRINCIPALES

| Paquete | Uso |
|---------|-----|
| `react` + `react-dom` | UI Framework |
| `react-router-dom` | Routing SPA |
| `@tanstack/react-query` | Estado del servidor, cache, refetch |
| `@supabase/supabase-js` | Cliente de Supabase |
| `tailwindcss` + `tailwindcss-animate` | Estilos utility-first |
| `@radix-ui/*` | Primitivos de UI accesibles |
| `lucide-react` | Iconos |
| `recharts` | Gráficas en dashboard/informes |
| `date-fns` | Manipulación de fechas |
| `zod` + `react-hook-form` | Validación de formularios |
| `jspdf` + `jsbarcode` | Generación de PDF y códigos de barras |
| `html5-qrcode` | Scanner de cámara |
| `sonner` | Notificaciones toast |
| `cmdk` | Command palette |
| `vaul` | Drawer mobile |

---

## 18. NOTAS PARA REPLICACIÓN

1. **Autenticación:** El sistema usa Supabase Auth con email/password. Al replicar, necesitas un sistema equivalente que soporte: registro, login, sesiones JWT, roles.

2. **RLS → Reglas de seguridad:** Las políticas RLS deben traducirse a las reglas de seguridad de tu nueva plataforma (ej: Firestore Security Rules, middleware de API, etc.).

3. **Edge Functions → Cloud Functions:** Las 4 edge functions deben replicarse como funciones serverless equivalentes con acceso privilegiado a la DB.

4. **Trigger handle_new_user:** Debe existir un equivalente que auto-cree el perfil cuando un usuario se registra.

5. **Multi-tenancy:** El aislamiento por `tenant_id` es FUNDAMENTAL. Cada query debe filtrar por tenant.

6. **Operaciones financieras:** SIEMPRE procesarlas en el servidor, nunca confiar en cálculos del cliente.

---

*Documento generado el 28/02/2026. Versión completa del sistema ERP CelPOS.*
