import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Grid3X3, Plus, User, Search, Settings, Scan, Play, Users, ChevronDown, Cpu, Palette, Leaf, Heart, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import idestrimLogo from '@/assets/idestrim-logo.png';

const categoryItems = [
  { name: 'Technology', icon: Cpu },
  { name: 'Fashion', icon: Palette },
  { name: 'Agriculture', icon: Leaf },
  { name: 'Art & Design', icon: Palette },
  { name: 'Health & Wellness', icon: Heart },
  { name: 'Gaming', icon: Gamepad2 },
  { name: 'Education', icon: Cpu },
];

const navItems = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/slides', icon: Play, label: 'Slides' },
  { to: '/idescan', icon: Scan, label: 'Idescan' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/search', icon: Search, label: 'Search' },
];

const bottomNavItems = [
  { to: '/upload', icon: Plus, label: 'Upload', isUpload: true },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const activeCategory = new URLSearchParams(location.search).get('category');
  const isCategoryActive = location.pathname === '/' && !!activeCategory;

  const handleCategoryClick = (name: string) => {
    navigate(`/?category=${encodeURIComponent(name.toLowerCase())}`);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-md border-r border-border z-40 flex flex-col">
      {/* Logo Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-center">
          <img src={idestrimLogo} alt="Idestrim" className="h-14 w-14 object-contain" />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to && !activeCategory
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

        {/* Categories with expandable sub-menu */}
        <div>
          <button
            onClick={() => setCategoriesOpen(!categoriesOpen)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative w-full",
              isCategoryActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Grid3X3
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isCategoryActive ? "scale-110" : "group-hover:scale-105"
              )}
            />
            <span className="font-medium">Categories</span>
            <ChevronDown
              className={cn(
                "ml-auto h-4 w-4 transition-transform duration-200",
                categoriesOpen && "rotate-180"
              )}
            />
            {isCategoryActive && (
              <div className="absolute right-0 w-1 h-6 bg-primary rounded-full" />
            )}
          </button>

          {categoriesOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {categoryItems.map((cat) => {
                const isActive = activeCategory === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryClick(cat.name)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 w-full text-sm",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <cat.icon className="h-4 w-4" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
