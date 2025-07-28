import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProfileData } from '@/hooks/useProfileData';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { supabase } from '@/integrations/supabase/client';
import { 
  Share, 
  Settings, 
  LogOut, 
  Globe, 
  Calendar,
  Edit,
  Grid,
  Video,
  Bookmark,
  ExternalLink
} from 'lucide-react';

interface UserProfile {
  full_name?: string;
  bio?: string;
  website_url?: string;
  avatar_url?: string;
  username?: string;
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState("ideas");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const [profileUserId, setProfileUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const { user, signOut } = useAuth();
  const { userId } = useParams();
  const { stats, loading: statsLoading, isFollowing, toggleFollow } = useProfileData(userId);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Determine whose profile to show
    const targetUserId = userId || user.id;
    setProfileUserId(targetUserId);
    setIsOwnProfile(targetUserId === user.id);
    
    fetchProfile(targetUserId);
  }, [user, navigate, userId]);

  const fetchProfile = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProfile(data || {});
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "You have been signed out",
      });
      navigate('/');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">
              {isOwnProfile ? 'Profile' : profile.full_name || 'Profile'}
            </h1>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Share className="h-5 w-5" />
              </Button>
              {isOwnProfile && (
                <>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto">
        {/* Profile Info */}
        <section className="px-4 py-6">
          <div className="text-center mb-6">
            <Avatar className="h-24 w-24 mx-auto mb-4 ring-4 ring-primary/20">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                {profile.full_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {profile.full_name || user.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-muted-foreground mb-4">
              @{profile.username || user.email?.split('@')[0] || 'user'}
            </p>
            
            {profile.bio && (
              <p className="text-sm text-foreground mb-4 max-w-xs mx-auto">
                {profile.bio}
              </p>
            )}

            {/* Website Link */}
            {profile.website_url && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <ExternalLink className="h-4 w-4 text-primary" />
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm text-primary"
                  onClick={() => window.open(profile.website_url, '_blank')}
                >
                  {profile.website_url}
                </Button>
              </div>
            )}

            {/* Join Date */}
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              }) : 'Recently'}
            </div>

            {isOwnProfile ? (
              <Button 
                variant="innovation" 
                size="sm" 
                className="gap-2"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            ) : (
              <Button 
                variant={isFollowing ? "outline" : "innovation"} 
                size="sm" 
                onClick={toggleFollow}
                disabled={statsLoading}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.mediaCount}
              </div>
              <div className="text-xs text-muted-foreground">Ideas</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">0</div>
              <div className="text-xs text-muted-foreground">Likes</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.followers}
              </div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.following}
              </div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              <DiscoveryFeed userOnly={true} userId={profileUserId} />
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
                <Button variant="innovation" size="sm" onClick={() => navigate('/upload')}>
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
                <Button variant="discovery" size="sm" onClick={() => navigate('/')}>
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
              <div className="text-sm font-medium">Creator</div>
              <div className="text-xs opacity-80">Upload content</div>
            </div>
            <div className="bg-gradient-primary p-4 rounded-xl text-center text-primary-foreground">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-sm font-medium">Member</div>
              <div className="text-xs opacity-80">Welcome aboard</div>
            </div>
          </div>
        </section>
      </div>

      {/* Profile Edit Dialog - Only show for own profile */}
      {isOwnProfile && (
        <ProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onProfileUpdate={() => fetchProfile(profileUserId)}
        />
      )}
    </div>
  );
}