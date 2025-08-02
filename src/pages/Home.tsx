import { Search, Bell, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import heroImage from '@/assets/hero-innovation.jpg';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
                </Button>
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

      {/* Hero Section */}
      <section className="px-4 py-8 max-w-md mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-innovation p-8 text-center text-primary-foreground">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">
              Share Your Innovation
            </h2>
            <p className="text-primary-foreground/90 mb-6">
              Turn your ideas into reality and inspire the world
            </p>
            <Button 
              variant="discovery" 
              size="lg" 
              className="bg-background text-primary hover:bg-white"
              onClick={() => navigate('/upload')}
            >
              Start Creating
            </Button>
          </div>
          <div className="absolute inset-0 opacity-20">
            <img 
              src={heroImage} 
              alt="Innovation" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Trending Categories */}
      <section className="px-4 mb-8 max-w-md mx-auto">
        <h3 className="text-lg font-semibold mb-4">Trending Categories</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Tech', 'Fashion', 'Agriculture', 'Art', 'Design', 'Health'].map((category) => (
            <Button
              key={category}
              variant="secondary"
              size="sm"
              className="whitespace-nowrap rounded-full"
            >
              {category}
            </Button>
          ))}
        </div>
      </section>

      {/* Ideas Feed */}
      <section className="px-4 pb-8 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Latest Ideas</h3>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
        
        <DiscoveryFeed />
      </section>
    </div>
  );
}