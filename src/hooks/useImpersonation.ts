import { useState, useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

interface ImpersonationState {
  tenantId: string;
  tenantName: string;
}

export function useImpersonation() {
  const [impersonation, setImpersonation] = useLocalStorage<ImpersonationState | null>('impersonated_tenant', null);

  const startImpersonation = useCallback((tenantId: string, tenantName: string) => {
    setImpersonation({ tenantId, tenantName });
  }, [setImpersonation]);

  const stopImpersonation = useCallback(() => {
    setImpersonation(null);
  }, [setImpersonation]);

  return {
    isImpersonating: !!impersonation,
    impersonatedTenantId: impersonation?.tenantId ?? null,
    impersonatedTenantName: impersonation?.tenantName ?? null,
    startImpersonation,
    stopImpersonation,
  };
}
