import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import idestrimLogo from '@/assets/idestrim-logo.png';

export function FixedHeader() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo and Slogan */}
          <div className="flex items-center gap-3">
            <img src={idestrimLogo} alt="Idestrim" className="h-10 w-10 object-contain" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              Share Your Innovation
            </span>
          </div>
          
          {/* Right side icons */}
          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
