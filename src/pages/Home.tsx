import { Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import idestrimLogo from '@/assets/idestrim-logo.png';

const IdescanButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="idescan-button relative group rounded-full px-6 py-3 bg-gradient-idescan text-white font-medium text-sm
      transform transition-all duration-300 ease-out shadow-idescan
      hover:scale-[1.03] active:scale-[0.98]
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(175,70%,45%)]
      overflow-hidden drop-shadow-lg"
  >
    <span className="relative z-10 flex items-center gap-2">
      <Sparkles className="h-4 w-4" />
      Explore Ideas
    </span>
    {/* Shimmer effect on hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
  </button>
);

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="space-y-6">
      {/* Ideas Feed */}
        <section>
          <DiscoveryFeed />
        </section>

        {/* Floating Idescan Button */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 ml-32 z-40 animate-float-up">
          <IdescanButton onClick={() => navigate('/idescan')} />
        </div>
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={idestrimLogo} alt="Idestrim" className="h-10 w-10 object-contain" />
              <span className="text-sm font-medium text-muted-foreground">
                Share Your Innovation
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/search')}
                className="text-muted-foreground hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </Button>
              {user && <NotificationBell />}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Ideas Feed */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <DiscoveryFeed />
      </section>

      {/* Floating Idescan Button */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-float-up">
        <IdescanButton onClick={() => navigate('/idescan')} />
      </div>
    </div>
  );
}