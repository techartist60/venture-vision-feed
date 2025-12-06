import { Search, Scan, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import idestrimLogo from '@/assets/idestrim-logo.png';
export default function Home() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Desktop layout - simplified without duplicate header
  if (!isMobile) {
    return <div className="space-y-4">
        {/* Idescan Feature Banner */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-glow">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scan className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Idescan</CardTitle>
              </div>
            </div>
            <CardDescription className="text-sm">
              Find similar ideas instantly - search patents, startups & innovations
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <Button onClick={() => navigate('/idescan')} className="gap-2" size="default">
              <Sparkles className="h-4 w-4" />
              Try Idescan Now
            </Button>
          </CardContent>
        </Card>

        {/* Ideas Feed */}
        <section>
          <DiscoveryFeed />
        </section>
      </div>;
  }

  // Mobile layout (existing design)

  return <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src={idestrimLogo} alt="Idestrim" className="h-10 w-10 object-contain" />
              <span className="text-sm font-medium text-muted-foreground">
                Share Your Innovation
              </span>
            </div>
            <div className="flex items-center gap-2">
              {user && <NotificationBell />}
              <ThemeToggle />
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search ideas, people..." className="pl-10 rounded-full bg-muted/50 border-0 focus:bg-background transition-colors cursor-pointer" readOnly onClick={() => navigate('/search')} />
          </div>
        </div>
      </header>

      {/* Idescan Banner */}
      <div className="px-4 py-4 max-w-md mx-auto">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 cursor-pointer hover:shadow-glow transition-all" onClick={() => navigate('/idescan')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <Scan className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">Idescan</h3>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Find similar ideas instantly
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ideas Feed */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <DiscoveryFeed />
      </section>
    </div>;
}