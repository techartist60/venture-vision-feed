import { NavLink, useLocation } from 'react-router-dom';
import { Home, Play, LayoutGrid, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { 
    to: '/', 
    icon: Home, 
    label: 'Home',
    exact: true
  },
  { 
    to: '/slides', 
    icon: Play, 
    label: 'Slides' 
  },
  { 
    to: '/categories', 
    icon: LayoutGrid, 
    label: 'Categories'
  },
  { 
    to: '/groups', 
    icon: Users, 
    label: 'Groups' 
  },
  { 
    to: '/profile', 
    icon: User, 
    label: 'Profile' 
  },
];

export default function BottomNavigation() {
  const location = useLocation();
  const { user } = useAuth();

  const userAvatarUrl = user?.user_metadata?.avatar_url;
  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-1 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);
          
          const isProfile = item.to === '/profile';
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center p-1.5 rounded-lg transition-all duration-300 min-w-0",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground",
                item.isUpload && "relative"
              )}
            >
              {item.isUpload ? (
                <div className="bg-gradient-innovation p-2 rounded-full shadow-glow">
                  <item.icon className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : isProfile && user ? (
                <Avatar className={cn("h-5 w-5 transition-all duration-300", isActive && "ring-2 ring-primary")}>
                  <AvatarImage src={userAvatarUrl} alt="Profile" />
                  <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
                </Avatar>
              ) : (
                <item.icon 
                  className={cn(
                    "h-4 w-4 transition-all duration-300",
                    isActive && "scale-110"
                  )} 
                />
              )}
              <span className={cn(
                "text-[10px] mt-0.5 font-medium transition-all duration-300 leading-tight",
                item.isUpload && "text-transparent"
              )}>
                {item.label}
              </span>
              {isActive && !item.isUpload && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}