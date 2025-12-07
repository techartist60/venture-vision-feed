import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';

export default function DesktopHeader() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-64 right-0 bg-background/95 backdrop-blur-md border-b border-border z-30 h-16">
      <div className="flex items-center justify-end px-6 py-4 h-full">
        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/search')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}