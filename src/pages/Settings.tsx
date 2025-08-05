import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Bell, 
  Moon, 
  Shield, 
  User, 
  Heart,
  MessageCircle,
  UserPlus,
  Download,
  Trash2,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  // Settings state
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    follows: true,
    push: true
  });
  
  const [privacy, setPrivacy] = useState({
    publicProfile: true,
    showActivity: true
  });

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

  const handleDeleteAccount = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Account deletion will be available in a future update",
    });
  };

  const handleDownloadData = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Data download will be available in a future update",
    });
  };

  const toggleNotification = (type: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [type]: !prev[type] }));
    toast({
      title: "Settings Updated",
      description: `${type} notifications ${notifications[type] ? 'disabled' : 'enabled'}`,
    });
  };

  const togglePrivacy = (type: keyof typeof privacy) => {
    setPrivacy(prev => ({ ...prev, [type]: !prev[type] }));
    toast({
      title: "Privacy Updated",
      description: `${type} setting ${privacy[type] ? 'disabled' : 'enabled'}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-discovery">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Manage your profile information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={() => navigate('/profile')}
            >
              Edit Profile
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Control what notifications you receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Likes</span>
              </div>
              <Switch 
                checked={notifications.likes}
                onCheckedChange={() => toggleNotification('likes')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Comments</span>
              </div>
              <Switch 
                checked={notifications.comments}
                onCheckedChange={() => toggleNotification('comments')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">New Followers</span>
              </div>
              <Switch 
                checked={notifications.follows}
                onCheckedChange={() => toggleNotification('follows')}
              />
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">Push Notifications</span>
              </div>
              <Switch 
                checked={notifications.push}
                onCheckedChange={() => toggleNotification('push')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control who can see your content and activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Public Profile</div>
                <div className="text-xs text-muted-foreground">Anyone can view your profile</div>
              </div>
              <Switch 
                checked={privacy.publicProfile}
                onCheckedChange={() => togglePrivacy('publicProfile')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Show Activity</div>
                <div className="text-xs text-muted-foreground">Let others see your recent activity</div>
              </div>
              <Switch 
                checked={privacy.showActivity}
                onCheckedChange={() => togglePrivacy('showActivity')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Data & Account</CardTitle>
            <CardDescription>
              Manage your data and account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleDownloadData}
            >
              <Download className="h-4 w-4" />
              Download My Data
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="pt-6">
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Version 1.0.0</p>
          <p>© 2025 IdeaStream. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}