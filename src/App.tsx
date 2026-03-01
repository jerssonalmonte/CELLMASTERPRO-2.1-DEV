import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Taller from "./pages/Taller";
import Vender from "./pages/Vender";
import Inventario from "./pages/Inventario";
import BuscadorIMEI from "./pages/BuscadorIMEI";
import Clientes from "./pages/Clientes";
import Compra from "./pages/Compra";
import Financiamientos from "./pages/Financiamientos";
import CuentasPorCobrar from "./pages/CuentasPorCobrar";
import Reportes from "./pages/Reportes";
import Informe from "./pages/Informe";
import Configuracion from "./pages/Configuracion";
import Perfil from "./pages/Perfil";
import Plan from "./pages/Plan";
import Suscripcion from "./pages/Suscripcion";
import Suspendida from "./pages/Suspendida";
import NotFound from "./pages/NotFound";

// Super Admin pages
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import AdminOrganizaciones from "./pages/admin/AdminOrganizaciones";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminMembresias from "./pages/admin/AdminMembresias";
import AdminReportes from "./pages/admin/AdminReportes";
import AdminConfiguracion from "./pages/admin/AdminConfiguracion";
import AdminAgenda from "./pages/admin/AdminAgenda";
import AdminProspectos from "./pages/admin/AdminProspectos";
import AdminGastos from "./pages/admin/AdminGastos";

const queryClient = new QueryClient();

const App = () => {
  // Global safety net for unhandled promise rejections (e.g. camera scanner errors)
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />

            {/* Super Admin Routes */}
            <Route path="/admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/admin/organizaciones" element={<SuperAdminRoute><AdminOrganizaciones /></SuperAdminRoute>} />
            <Route path="/admin/usuarios" element={<SuperAdminRoute><AdminUsuarios /></SuperAdminRoute>} />
            <Route path="/admin/membresias" element={<SuperAdminRoute><AdminMembresias /></SuperAdminRoute>} />
            <Route path="/admin/reportes" element={<SuperAdminRoute><AdminReportes /></SuperAdminRoute>} />
            <Route path="/admin/configuracion" element={<SuperAdminRoute><AdminConfiguracion /></SuperAdminRoute>} />
            <Route path="/admin/agenda" element={<SuperAdminRoute><AdminAgenda /></SuperAdminRoute>} />
            <Route path="/admin/prospectos" element={<SuperAdminRoute><AdminProspectos /></SuperAdminRoute>} />
            <Route path="/admin/gastos" element={<SuperAdminRoute><AdminGastos /></SuperAdminRoute>} />

            {/* Legacy SysAdmin redirect */}
            <Route path="/sys-admin" element={<Navigate to="/admin" replace />} />

            {/* Organization Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/taller" element={<ProtectedRoute><Taller /></ProtectedRoute>} />
            <Route path="/vender" element={<ProtectedRoute allowedRoles={['admin','manager','staff','super_admin']}><Vender /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute allowedRoles={['admin','manager','staff','super_admin']}><Inventario /></ProtectedRoute>} />
            <Route path="/buscador-imei" element={<ProtectedRoute allowedRoles={['admin','manager','staff','super_admin']}><BuscadorIMEI /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute allowedRoles={['admin','manager','staff','super_admin']}><Clientes /></ProtectedRoute>} />
            <Route path="/trade-in" element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']}><Compra /></ProtectedRoute>} />
            <Route path="/compra" element={<Navigate to="/trade-in" replace />} />
            <Route path="/financiamientos" element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']}><Financiamientos /></ProtectedRoute>} />
            <Route path="/cuentas-por-cobrar" element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']}><CuentasPorCobrar /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']}><Reportes /></ProtectedRoute>} />
            <Route path="/informe" element={<ProtectedRoute allowedRoles={['admin','manager','super_admin']}><Informe /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute allowedRoles={['admin','super_admin']}><Configuracion /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/suscripcion" element={<ProtectedRoute><Suscripcion /></ProtectedRoute>} />
            <Route path="/suspendida" element={<Suspendida />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
