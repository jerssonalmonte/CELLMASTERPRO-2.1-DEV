import { useNavigate } from 'react-router-dom';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedTenantName, stopImpersonation } = useImpersonation();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-black">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>Estás viendo <strong>{impersonatedTenantName}</strong> como Super Admin</span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 gap-1.5 bg-black/20 text-black hover:bg-black/30 border-0"
        onClick={() => {
          stopImpersonation();
          navigate('/admin/organizaciones');
        }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al Panel Admin
      </Button>
    </div>
  );
}
