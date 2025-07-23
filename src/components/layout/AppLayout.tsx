import { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
  showNavigation?: boolean;
}

export default function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-discovery">
      <main className={cn(
        "min-h-screen",
        showNavigation && "pb-20" // Add padding bottom when navigation is shown
      )}>
        {children}
      </main>
      {showNavigation && <BottomNavigation />}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}