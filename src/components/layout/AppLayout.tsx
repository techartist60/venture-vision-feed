import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import BottomNavigation from './BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
}

export default function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  const { loading } = useAuth();
  const location = useLocation();
  
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

  return (
    <div className="min-h-screen bg-gradient-discovery">
      <main className={cn(
        "min-h-screen",
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