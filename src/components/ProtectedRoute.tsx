import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useImpersonation } from '@/hooks/useImpersonation';
import type { AppRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, loading, tenant } = useAuth();
  const { isImpersonating } = useImpersonation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super admin not impersonating should go to /admin
  if (role === 'super_admin' && !isImpersonating) {
    return <Navigate to="/admin" replace />;
  }

  // Block suspended tenants (except super_admin)
  if (tenant?.subscription_status === 'suspendida' && role !== 'super_admin') {
    return <Navigate to="/suspendida" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
