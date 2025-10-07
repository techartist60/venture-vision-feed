import { Search, User, Scan, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationBell } from '@/components/NotificationBell';
import heroImage from '@/assets/hero-innovation.jpg';
export default function Home() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Desktop layout - simplified without duplicate header
  if (!isMobile) {
    return <div className="space-y-8">
        {/* Idescan Feature Banner */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 shadow-glow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scan className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Idescan</CardTitle>
                
              </div>
            </div>
            <CardDescription className="text-base">
              Find similar ideas instantly - search patents, startups & innovations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button onClick={() => navigate('/idescan')} className="gap-2" size="lg">
                <Sparkles className="h-5 w-5" />
                Try Idescan Now
              </Button>
              
            </div>
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
            <div>
              <h1 className="text-2xl font-bold bg-gradient-innovation bg-clip-text text-transparent">
                Idestrim
              </h1>
              <p className="text-sm text-muted-foreground">Discover New Ideas</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              {!user ? <Link to="/auth">
                  <Button variant="innovation" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link> : <Link to="/profile" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-5 w-5" />
                  {user?.user_metadata?.full_name || 'Profile'}
                </Link>}
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
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    NEW
                  </span>
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