import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import BottomNavigation from './BottomNavigation';
import DesktopLayout from './DesktopLayout';
import { AtomLoader } from '@/components/ui/AtomLoader';

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
    return <AtomLoader fullScreen size={88} label="Loading..." />;
  }

  // Desktop layout
  if (!isMobile && !hideNavigation) {
    return (
      <DesktopLayout showTrendingSidebar={location.pathname === '/'}>
        {children}
      </DesktopLayout>
    );
  }

  // Mobile layout
  return (
    <div className="min-h-screen bg-gradient-discovery">
      <main className={cn(
        "min-h-screen",
        shouldShowNavigation && "pb-20"
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