import { Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import IdeaCard from '@/components/ui/IdeaCard';
import heroImage from '@/assets/hero-innovation.jpg';

// Mock data for demonstration
const mockIdeas = [
  {
    id: '1',
    title: 'Smart Plant Watering System',
    description: 'An IoT-based automated watering system that monitors soil moisture and weather conditions to optimize plant care.',
    category: 'Tech',
    mediaType: 'image' as const,
    mediaUrl: heroImage,
    user: {
      name: 'Alex Chen',
      username: 'alexchen',
      avatar: undefined
    },
    stats: {
      likes: 234,
      comments: 45,
      shares: 12
    },
    isLiked: true
  },
  {
    id: '2',
    title: 'Sustainable Fashion Collection',
    description: 'A complete fashion line made from recycled ocean plastic, combining style with environmental responsibility.',
    category: 'Fashion',
    mediaType: 'video' as const,
    mediaUrl: '',
    user: {
      name: 'Maya Rodriguez',
      username: 'mayar',
      avatar: undefined
    },
    stats: {
      likes: 189,
      comments: 32,
      shares: 8
    }
  },
  {
    id: '3',
    title: 'Vertical Farming Innovation',
    description: 'Revolutionary vertical farming technique that increases crop yield by 300% using LED lighting and hydroponics.',
    category: 'Agriculture',
    mediaType: 'image' as const,
    mediaUrl: heroImage,
    user: {
      name: 'David Kim',
      username: 'davidk',
      avatar: undefined
    },
    stats: {
      likes: 456,
      comments: 67,
      shares: 23
    },
    isSaved: true
  }
];

export default function Home() {
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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ideas, creators..." 
              className="pl-10 rounded-full bg-muted/50 border-0 focus:bg-background transition-colors"
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
            <Button variant="discovery" size="lg" className="bg-background text-primary hover:bg-white">
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
        
        <div className="space-y-6">
          {mockIdeas.map((idea) => (
            <IdeaCard key={idea.id} {...idea} />
          ))}
        </div>
      </section>
    </div>
  );
}