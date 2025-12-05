import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid3X3, Plus, User, Search, Settings, Scan, Play, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import idestrimLogo from '@/assets/idestrim-logo.png';

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
    to: '/idescan', 
    icon: Scan, 
    label: 'Idescan'
  },
  { 
    to: '/categories', 
    icon: Grid3X3, 
    label: 'Categories' 
  },
  { 
    to: '/groups', 
    icon: Users, 
    label: 'Groups' 
  },
  { 
    to: '/search', 
    icon: Search, 
    label: 'Search' 
  },
];

const bottomNavItems = [
  { 
    to: '/upload', 
    icon: Plus, 
    label: 'Upload',
    isUpload: true
  },
  { 
    to: '/profile', 
    icon: User, 
    label: 'Profile' 
  },
  { 
    to: '/settings', 
    icon: Settings, 
    label: 'Settings' 
  },
];

export default function DesktopSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-md border-r border-border z-40 flex flex-col">
      {/* Logo Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-center">
          <img src={idestrimLogo} alt="Idestrim" className="h-14 w-14 object-contain" />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive ? "scale-110" : "group-hover:scale-105"
                )} 
              />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-6 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Upload Section */}
      <div className="px-4 pb-4">
        <NavLink
          to="/upload"
          className="flex items-center gap-3 px-4 py-3 bg-gradient-innovation rounded-xl text-primary-foreground hover:shadow-glow transition-all duration-200"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Create New</span>
        </NavLink>
      </div>

      {/* Bottom Navigation */}
      <nav className="px-4 pb-6 space-y-2 border-t border-border pt-4">
        {bottomNavItems.filter(item => !item.isUpload).map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group text-sm",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}