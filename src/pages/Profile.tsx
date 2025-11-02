import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useProfileData } from '@/hooks/useProfileData';
import { ProfileEditDialog } from '@/components/ProfileEditDialog';
import { DiscoveryFeed } from '@/components/DiscoveryFeed';
import { SavedContent } from '@/components/SavedContent';
import { FollowersList } from '@/components/FollowersList';
import { FollowingList } from '@/components/FollowingList';
import { supabase } from '@/integrations/supabase/client';
import SignupPrompt from '@/components/SignupPrompt';
import QRCode from 'qrcode';
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
  ExternalLink,
  Copy,
  QrCode,
  Download,
  BarChart3,
  TrendingUp,
  DollarSign,
  MessageCircle
} from 'lucide-react';
import { MessageDialog } from '@/components/MessageDialog';

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [profile, setProfile] = useState<UserProfile>({});
  const [profileUserId, setProfileUserId] = useState<string>('');
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [signupPrompt, setSignupPrompt] = useState<{ open: boolean; action: string }>({ open: false, action: '' });
  const [investmentReadyCount, setInvestmentReadyCount] = useState(0);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { userId } = useParams();
  const { stats, loading: statsLoading, isFollowing, toggleFollow, refetch } = useProfileData(userId);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Determine whose profile to show
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      if (!user && !userId) {
        navigate('/auth');
        return;
      }
    } else {
      setProfileUserId(targetUserId);
      setIsOwnProfile(user ? targetUserId === user.id : false);
      fetchProfile(targetUserId);
      fetchInvestmentReadyCount(targetUserId);
    }
  }, [user, navigate, userId]);

  const fetchInvestmentReadyCount = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_investment_ready_count', {
        profile_user_id: targetUserId
      });

      if (error) throw error;
      setInvestmentReadyCount(data || 0);
    } catch (error) {
      console.error('Error fetching investment ready count:', error);
    }
  };

  const fetchProfile = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setProfile(data || {});
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const generateQRCode = async () => {
    try {
      const profileUrl = `${window.location.origin}/profile/${profileUserId}`;
      const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleShare = () => {
    generateQRCode();
    setShareDialogOpen(true);
  };

  const copyProfileLink = async () => {
    const profileUrl = `${window.location.origin}/profile/${profileUserId}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copied!",
        description: "Profile link has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `${profile.username || 'profile'}-qrcode.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFollowToggle = async () => {
    if (!user) {
      setSignupPrompt({ open: true, action: 'follow this creator' });
      return;
    }
    await toggleFollow();
    // The real-time listeners will handle the updates automatically
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

  if (!profileUserId) {
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
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share className="h-5 w-5" />
              </Button>
              {isOwnProfile && user && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
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
                {profile.full_name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {profile.full_name || 'User'}
            </h2>
            <p className="text-muted-foreground mb-4">
              @{profile.full_name?.toLowerCase().replace(/\s+/g, '') || 'user'}
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


            {isOwnProfile && user ? (
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
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="innovation" 
                  size="sm" 
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
                {user && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setMessageDialogOpen(true)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Analytics Button for Own Profile */}
          {isOwnProfile && user && (
            <div className="mb-6">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 w-full"
                onClick={() => navigate('/analytics')}
              >
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.mediaCount}
              </div>
              <div className="text-xs text-muted-foreground">Ideas</div>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.totalViews}
              </div>
              <div className="text-xs text-muted-foreground">Views</div>
            </div>
            <div 
              className="p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setFollowersDialogOpen(true)}
            >
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.followers}
              </div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div 
              className="p-3 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setFollowingDialogOpen(true)}
            >
              <div className="text-xl font-bold text-foreground">
                {statsLoading ? '...' : stats.following}
              </div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
          </div>

          {/* Investment Readiness Section */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-foreground">Investment Readiness</h3>
              </div>
              {investmentReadyCount > 0 && (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Investment Ready
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${investmentReadyCount > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {investmentReadyCount > 0 ? '🟢 Open for Investment' : '⚪ Not Open'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Investment-Ready Posts:</span>
                <span className="font-medium text-foreground">{investmentReadyCount}</span>
              </div>
            </div>
            {isOwnProfile && (
              <p className="text-xs text-muted-foreground mt-3">
                {investmentReadyCount > 0 
                  ? 'Your investment-ready posts are visible to investors via the Idestrim API'
                  : 'Mark your posts as "Open for Investment" when uploading to attract investors'}
              </p>
            )}
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
              <DiscoveryFeed userOnly={true} userId={profileUserId} mediaType="video" />
            </TabsContent>

            <TabsContent value="saved" className="mt-6">
              <SavedContent userId={profileUserId} />
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

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Share Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Copy Link Section */}
            <div className="text-center">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={copyProfileLink}
              >
                <Copy className="h-4 w-4" />
                Copy Profile Link
              </Button>
            </div>
            
            {/* QR Code Section */}
            <div className="text-center">
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Scan QR Code</h4>
                <div className="flex justify-center">
                  {qrCodeUrl ? (
                    <img 
                      src={qrCodeUrl} 
                      alt="Profile QR Code" 
                      className="w-48 h-48 border rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-muted">
                      <QrCode className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              
              {qrCodeUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={downloadQRCode}
                >
                  <Download className="h-4 w-4" />
                  Download QR Code
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followers Dialog */}
      <Dialog open={followersDialogOpen} onOpenChange={setFollowersDialogOpen}>
        <DialogContent className="max-w-sm mx-auto max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">Followers</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <FollowersList 
              userId={profileUserId} 
              onClose={() => setFollowersDialogOpen(false)} 
              refresh={refreshTrigger}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={followingDialogOpen} onOpenChange={setFollowingDialogOpen}>
        <DialogContent className="max-w-sm mx-auto max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">Following</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <FollowingList 
              userId={profileUserId} 
              onClose={() => setFollowingDialogOpen(false)} 
              refresh={refreshTrigger}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog - Only show for own profile */}
      {isOwnProfile && user && (
        <ProfileEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          profile={profile}
          onProfileUpdate={() => fetchProfile(profileUserId)}
        />
      )}

      {/* Message Dialog - Only show for other profiles */}
      {!isOwnProfile && user && (
        <MessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          recipientId={profileUserId}
          recipientName={profile.full_name || 'User'}
          recipientAvatar={profile.avatar_url}
        />
      )}
      
      <SignupPrompt
        open={signupPrompt.open}
        onOpenChange={(open) => setSignupPrompt({ ...signupPrompt, open })}
        action={signupPrompt.action}
      />
    </div>
  );
}