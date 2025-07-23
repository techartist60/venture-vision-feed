import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Grid3X3, Plus, Video, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { 
    to: '/', 
    icon: Home, 
    label: 'Home',
    exact: true
  },
  { 
    to: '/categories', 
    icon: Grid3X3, 
    label: 'Categories' 
  },
  { 
    to: '/upload', 
    icon: Plus, 
    label: 'Upload',
    isUpload: true
  },
  { 
    to: '/inventions', 
    icon: Video, 
    label: 'Inventions' 
  },
  { 
    to: '/profile', 
    icon: User, 
    label: 'Profile' 
  },
];

export default function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.to 
            : location.pathname.startsWith(item.to);
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 min-w-0",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground",
                item.isUpload && "relative"
              )}
            >
              {item.isUpload ? (
                <div className="bg-gradient-innovation p-3 rounded-full shadow-glow">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
              ) : (
                <item.icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive && "scale-110"
                  )} 
                />
              )}
              <span className={cn(
                "text-xs mt-1 font-medium transition-all duration-300",
                item.isUpload && "text-transparent"
              )}>
                {item.label}
              </span>
              {isActive && !item.isUpload && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}