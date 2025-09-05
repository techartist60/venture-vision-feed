import { Search, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { useIsMobile } from '@/hooks/use-mobile';
import heroImage from '@/assets/hero-innovation.jpg';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Desktop layout - simplified without duplicate header
  if (!isMobile) {
    return (
      <div className="space-y-8">
        {/* Ideas Feed */}
        <section>
          <DiscoveryFeed />
        </section>
      </div>
    );
  }

  // Mobile layout (existing design)
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-innovation bg-clip-text text-transparent">
                Idestrim
              </h1>
              <p className="text-sm text-muted-foreground">Discover Innovation</p>
            </div>
            <div className="flex items-center gap-2">
              {!user ? (
                <Link to="/auth">
                  <Button variant="innovation" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              ) : (
                <Link to="/profile" className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-5 w-5" />
                  {user?.user_metadata?.full_name || 'Profile'}
                </Link>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ideas, creators..." 
              className="pl-10 rounded-full bg-muted/50 border-0 focus:bg-background transition-colors cursor-pointer"
              readOnly
              onClick={() => navigate('/search')}
            />
          </div>
        </div>
      </header>

      {/* Ideas Feed */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <DiscoveryFeed />
      </section>
    </div>
  );
}