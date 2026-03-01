import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,20%,7%)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
