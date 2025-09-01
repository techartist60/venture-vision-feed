import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/NotificationBell';
import BottomNavigation from './BottomNavigation';
import DesktopLayout from './DesktopLayout';

interface AppLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
}

export default function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  const { loading } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Don't show navigation on auth page
  const hideNavigation = location.pathname === '/auth';
  const shouldShowNavigation = showNavigation && !hideNavigation;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-discovery flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Desktop layout
  if (!isMobile && !hideNavigation) {
    return (
      <DesktopLayout showTrendingSidebar={location.pathname === '/'}>
        {children}
      </DesktopLayout>
    );
  }

  // Mobile layout (existing design)
  return (
    <div className="min-h-screen bg-gradient-discovery">
      {/* Header with theme toggle and notifications */}
      <header className="fixed top-0 right-0 z-50 p-4 flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
      </header>
      <main className={cn(
        "min-h-screen pt-16",
        shouldShowNavigation && "pb-20" // Add padding bottom when navigation is shown
      )}>
        {children}
      </main>
      {shouldShowNavigation && <BottomNavigation />}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}