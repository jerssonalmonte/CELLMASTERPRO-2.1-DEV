import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { tenant } = useAuth();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <ImpersonationBanner />
        <SubscriptionBanner />
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-1" />
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground truncate">{tenant?.name}</span>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
