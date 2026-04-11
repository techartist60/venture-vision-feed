import { useState } from 'react';
import {
  Grid3X3, Cpu, Palette, Leaf, Heart, Gamepad2,
  Music, BookOpen, Utensils, Car, Building2, Camera,
  Dumbbell, Plane, ShoppingBag, Briefcase, GraduationCap, Film
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

const categories = [
  { id: 'tech', name: 'Technology', icon: Cpu, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'fashion', name: 'Fashion', icon: ShoppingBag, gradient: 'from-pink-500 to-rose-600' },
  { id: 'agriculture', name: 'Agriculture', icon: Leaf, gradient: 'from-green-500 to-emerald-600' },
  { id: 'art', name: 'Art & Design', icon: Palette, gradient: 'from-orange-500 to-red-500' },
  { id: 'health', name: 'Health', icon: Heart, gradient: 'from-red-500 to-pink-600' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, gradient: 'from-purple-500 to-indigo-600' },
  { id: 'music', name: 'Music', icon: Music, gradient: 'from-violet-500 to-purple-600' },
  { id: 'education', name: 'Education', icon: GraduationCap, gradient: 'from-cyan-500 to-blue-600' },
  { id: 'food', name: 'Food', icon: Utensils, gradient: 'from-amber-500 to-orange-600' },
  { id: 'automotive', name: 'Automotive', icon: Car, gradient: 'from-slate-500 to-zinc-700' },
  { id: 'architecture', name: 'Architecture', icon: Building2, gradient: 'from-teal-500 to-cyan-600' },
  { id: 'photography', name: 'Photography', icon: Camera, gradient: 'from-rose-500 to-pink-600' },
  { id: 'fitness', name: 'Fitness', icon: Dumbbell, gradient: 'from-lime-500 to-green-600' },
  { id: 'travel', name: 'Travel', icon: Plane, gradient: 'from-sky-500 to-blue-600' },
  { id: 'business', name: 'Business', icon: Briefcase, gradient: 'from-emerald-500 to-teal-600' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, gradient: 'from-fuchsia-500 to-purple-600' },
  { id: 'literature', name: 'Literature', icon: BookOpen, gradient: 'from-yellow-500 to-amber-600' },
];

export default function Categories() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/?category=${encodeURIComponent(categoryName.toLowerCase())}`);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Grid3X3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Categories</h1>
          </div>
          <Input
            placeholder="Search categories..."
            className="rounded-full bg-muted/50 border-0 focus:bg-background transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <section className="px-4 py-6 max-w-lg mx-auto">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Grid3X3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No categories found</h3>
            <p className="text-sm text-muted-foreground">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => handleCategoryClick(category.name)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br ${category.gradient} cursor-pointer group hover:scale-[1.04] active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg aspect-square`}
              >
                <category.icon className="h-7 w-7 text-white mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-white text-xs font-semibold text-center leading-tight">{category.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
