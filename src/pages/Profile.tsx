import { useState } from 'react';
import { Settings, Share, Edit, Heart, MessageCircle, Bookmark, Grid, Video, Camera, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import heroImage from '@/assets/hero-innovation.jpg';

// Mock user data
const userData = {
  name: 'Alex Chen',
  username: 'alexchen',
  bio: 'Passionate innovator • IoT enthusiast • Building the future one idea at a time 🚀',
  avatar: undefined,
  followers: 2847,
  following: 195,
  ideas: 23,
  totalLikes: 15600,
  website: 'alexchen.dev',
  location: 'San Francisco, CA',
  joinedDate: 'January 2024'
};

const mockIdeas = [
  {
    id: '1',
    title: 'Smart Plant Watering System',
    type: 'image',
    thumbnail: heroImage,
    likes: 234,
    comments: 45
  },
  {
    id: '2',
    title: 'IoT Home Security',
    type: 'video',
    thumbnail: heroImage,
    likes: 189,
    comments: 32
  },
  {
    id: '3',
    title: 'Sustainable Energy Monitor',
    type: 'image',
    thumbnail: heroImage,
    likes: 456,
    comments: 67
  }
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState('ideas');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Profile</h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Share className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Profile Info */}
        <section className="px-4 py-6">
          <div className="text-center mb-6">
            <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
              <AvatarImage src={userData.avatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                {userData.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold text-foreground mb-1">{userData.name}</h2>
            <p className="text-muted-foreground mb-4">@{userData.username}</p>
            
            <p className="text-sm text-foreground mb-4 max-w-xs mx-auto">
              {userData.bio}
            </p>

            {/* Website Link */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <ExternalLink className="h-4 w-4 text-primary" />
              <Button variant="link" className="p-0 h-auto text-sm text-primary">
                {userData.website}
              </Button>
            </div>

            <Button variant="innovation" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">{userData.ideas}</div>
              <div className="text-xs text-muted-foreground">Ideas</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">{userData.totalLikes}</div>
              <div className="text-xs text-muted-foreground">Likes</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">{userData.followers}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">{userData.following}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="px-4">
          <Tabs defaultValue="ideas" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/50">
              <TabsTrigger value="ideas" className="gap-2 rounded-lg">
                <Grid className="h-4 w-4" />
                Ideas
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2 rounded-lg">
                <Video className="h-4 w-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-2 rounded-lg">
                <Bookmark className="h-4 w-4" />
                Saved
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ideas" className="mt-6">
              <div className="grid grid-cols-2 gap-3">
                {mockIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="relative aspect-square bg-muted rounded-xl overflow-hidden group cursor-pointer"
                  >
                    <img 
                      src={idea.thumbnail} 
                      alt={idea.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{idea.title}</h3>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {idea.likes}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {idea.comments}
                        </div>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-2 right-2">
                      {idea.type === 'video' ? (
                        <div className="w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Video className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Camera className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="videos" className="mt-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No videos yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start sharing your ideas through videos
                </p>
                <Button variant="innovation" size="sm">
                  Create Video
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="saved" className="mt-6">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-innovation rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No saved ideas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ideas you save will appear here
                </p>
                <Button variant="discovery" size="sm">
                  Discover Ideas
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Achievement Section */}
        <section className="px-4 py-6">
          <h3 className="text-lg font-semibold mb-4">Achievements</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-innovation p-4 rounded-xl text-center text-primary-foreground">
              <div className="text-2xl mb-2">🏆</div>
              <div className="text-sm font-medium">Top Creator</div>
              <div className="text-xs opacity-80">This month</div>
            </div>
            <div className="bg-gradient-primary p-4 rounded-xl text-center text-primary-foreground">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-sm font-medium">Rising Star</div>
              <div className="text-xs opacity-80">100+ likes</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}