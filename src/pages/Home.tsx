import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import idestrimLogo from '@/assets/idestrim-logo.png';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const activeCategory = searchParams.get('category') || undefined;

  const clearCategory = () => {
    setSearchParams({});
  };

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="space-y-6">
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
          <DiscoveryFeed category={activeCategory} excludeVideo />
        </section>
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

      {/* Active Category Filter */}
      {activeCategory && (
        <div className="flex items-center gap-2 px-4 max-w-md mx-auto my-3">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary" className="capitalize flex items-center gap-1">
            {activeCategory}
            <X className="h-3 w-3 cursor-pointer" onClick={clearCategory} />
          </Badge>
        </div>
      )}

      {/* Ideas Feed */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <DiscoveryFeed category={activeCategory} excludeVideo />
      </section>
    </div>
  );
}
