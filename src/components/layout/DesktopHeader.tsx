import { Search, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function DesktopHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-64 right-0 bg-background/95 backdrop-blur-md border-b border-border z-30 h-16">
      <div className="flex items-center justify-between px-6 py-4 h-full">
        {/* Search */}
        <div className="flex-1 max-w-2xl mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ideas, creators..." 
              className="pl-10 rounded-full bg-muted/50 border-0 focus:bg-background transition-colors cursor-pointer w-full"
              readOnly
              onClick={() => navigate('/search')}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {!user ? (
            <Link to="/auth">
              <Button variant="innovation" size="sm">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          ) : (
            <Link to="/profile">
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}