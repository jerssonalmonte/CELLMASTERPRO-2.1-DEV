import { SuperAdminSidebar } from '@/components/SuperAdminSidebar';
import { SuperAdminMobileHeader } from '@/components/SuperAdminMobileHeader';
import { AdminNotificationBell } from '@/components/AdminNotificationBell';

export function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[hsl(220,20%,7%)]">
      <SuperAdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <SuperAdminMobileHeader />
        {/* Desktop topbar with notification bell */}
        <header className="hidden md:flex h-12 items-center justify-end px-6 border-b border-white/[0.04] bg-[hsl(220,20%,7%)]">
          <AdminNotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
