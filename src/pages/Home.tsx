import { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, X, Globe } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import TryItNowDialog from '@/components/TryItNowDialog';
import idestrimLogo from '@/assets/idestrim-logo.png';
import ArtemisLivePopup from '@/components/ArtemisLivePopup';

const IdescanButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="idescan-button relative group rounded-full px-6 py-3 bg-gradient-idescan text-white font-medium text-sm
      transform transition-all duration-300 ease-out shadow-idescan
      hover:scale-[1.03] active:scale-[0.98]
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(175,70%,45%)]
      overflow-hidden"
  >
    <span className="relative z-10 flex items-center gap-2">
      <Sparkles className="h-4 w-4" />
      Explore Ideas
    </span>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
  </button>
);

const TryItNowButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="relative group rounded-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-sm
      transform transition-all duration-300 ease-out shadow-lg
      hover:scale-[1.03] active:scale-[0.98]
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400
      overflow-hidden"
  >
    <span className="relative z-10 flex items-center gap-2">
      <Globe className="h-4 w-4" />
      Try It Now
    </span>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out" />
  </button>
);

const FloatingIdescanLogo = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="idescan-button p-2.5 rounded-full bg-gradient-idescan shadow-idescan
      transform transition-all duration-300 ease-out
      hover:scale-110 active:scale-95
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(175,70%,45%)]
      drop-shadow-lg"
    aria-label="Open Idescan"
  >
    <Sparkles className="h-5 w-5 text-white" />
  </button>
);

const FloatingTryItNow = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg
      transform transition-all duration-300 ease-out
      hover:scale-110 active:scale-95
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400
      drop-shadow-lg"
    aria-label="Try It Now"
  >
    <Globe className="h-5 w-5 text-white" />
  </button>
);

function useScrolledPast(threshold: number) {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolledPast;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const scrolledPast = useScrolledPast(120);
  const activeCategory = searchParams.get('category') || undefined;
  const [tryItDialogOpen, setTryItDialogOpen] = useState(false);

  const clearCategory = () => {
    setSearchParams({});
  };

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="space-y-6">
        {/* Idescan & Try It Now Invitation - inline */}
        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-float-up">
          <p className="text-muted-foreground text-sm">Curious if your idea already exists?</p>
          <div className="flex items-center gap-4">
            <IdescanButton onClick={() => navigate('/idescan')} />
            <TryItNowButton onClick={() => setTryItDialogOpen(true)} />
          </div>
        </div>

        {/* Active Category Filter */}
        {activeCategory && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            <Badge variant="secondary" className="capitalize flex items-center gap-1">
              {activeCategory}
              <X className="h-3 w-3 cursor-pointer" onClick={clearCategory} />
            </Badge>
          </div>
        )}

        {/* Ideas Feed */}
        <section>
          <DiscoveryFeed category={activeCategory} />
        </section>

        {/* Floating mini logo - appears on scroll, top-left */}
        <div className={`fixed top-20 left-72 z-40 transition-all duration-300 ${
          scrolledPast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}>
          <FloatingIdescanLogo onClick={() => navigate('/idescan')} />
        </div>

        {/* Floating Try It Now - appears on scroll, top-right */}
        <div className={`fixed top-20 right-6 z-40 transition-all duration-300 ${
          scrolledPast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}>
          <FloatingTryItNow onClick={() => setTryItDialogOpen(true)} />
        </div>

        <TryItNowDialog open={tryItDialogOpen} onOpenChange={setTryItDialogOpen} />
        <ArtemisLivePopup />
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

      {/* Idescan & Try It Now Invitation - inline */}
      <div className="px-4 py-6 max-w-md mx-auto flex flex-col items-center space-y-3 animate-float-up">
        <p className="text-muted-foreground text-xs text-center">Curious if your idea already exists?</p>
        <div className="flex items-center gap-3">
          <IdescanButton onClick={() => navigate('/idescan')} />
          <TryItNowButton onClick={() => setTryItDialogOpen(true)} />
        </div>
      </div>

      {/* Active Category Filter */}
      {activeCategory && (
        <div className="flex items-center gap-2 px-4 max-w-md mx-auto mb-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary" className="capitalize flex items-center gap-1">
            {activeCategory}
            <X className="h-3 w-3 cursor-pointer" onClick={clearCategory} />
          </Badge>
        </div>
      )}

      {/* Ideas Feed */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <DiscoveryFeed category={activeCategory} />
      </section>

      {/* Floating mini logo - appears on scroll, top-left */}
      <div className={`fixed top-16 left-3 z-50 transition-all duration-300 ${
        scrolledPast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <FloatingIdescanLogo onClick={() => navigate('/idescan')} />
      </div>

      {/* Floating Try It Now - appears on scroll, top-right */}
      <div className={`fixed top-16 right-3 z-50 transition-all duration-300 ${
        scrolledPast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}>
        <FloatingTryItNow onClick={() => setTryItDialogOpen(true)} />
      </div>

      <TryItNowDialog open={tryItDialogOpen} onOpenChange={setTryItDialogOpen} />
    </div>
  );
}
