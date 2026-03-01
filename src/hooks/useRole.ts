import { useAuth } from './useAuth';

export function useRole() {
  const { role, loading } = useAuth();

  return {
    role,
    loading,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    isTechnician: role === 'technician',
    canViewFinancials: ['super_admin', 'admin', 'manager'].includes(role),
    canEdit: ['super_admin', 'admin', 'manager'].includes(role),
    canDelete: ['super_admin', 'admin', 'manager'].includes(role),
    canExport: ['super_admin', 'admin', 'manager'].includes(role),
  };
}
