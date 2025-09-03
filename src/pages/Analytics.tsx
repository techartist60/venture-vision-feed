import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Eye, Heart, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalVideos: number;
  topPerformingMedia: Array<{
    id: string;
    title: string;
    views_count: number;
    likes_count: number;
    comments_count: number;
    media_type: string;
    created_at: string;
  }>;
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0,
    totalVideos: 0,
    topPerformingMedia: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAnalytics();
  }, [user, navigate]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Get total stats
      const [mediaResponse, followersResponse] = await Promise.all([
        supabase
          .from('media_uploads')
          .select('views_count, likes_count, comments_count, media_type')
          .eq('user_id', user.id),
        supabase
          .from('followers')
          .select('id')
          .eq('following_id', user.id)
      ]);

      if (mediaResponse.error) throw mediaResponse.error;
      if (followersResponse.error) throw followersResponse.error;

      const media = mediaResponse.data || [];
      const followers = followersResponse.data || [];

      const totalViews = media.reduce((sum, item) => sum + (item.views_count || 0), 0);
      const totalLikes = media.reduce((sum, item) => sum + (item.likes_count || 0), 0);
      const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
      const totalVideos = media.filter(item => item.media_type.startsWith('video')).length;

      // Get top performing media
      const topMediaResponse = await supabase
        .from('media_uploads')
        .select('id, title, views_count, likes_count, comments_count, media_type, created_at')
        .eq('user_id', user.id)
        .order('views_count', { ascending: false })
        .limit(5);

      if (topMediaResponse.error) throw topMediaResponse.error;

      setAnalytics({
        totalViews,
        totalLikes,
        totalComments,
        totalFollowers: followers.length,
        totalVideos,
        topPerformingMedia: topMediaResponse.data || []
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse space-y-4 p-4">
          <div className="h-6 bg-muted rounded w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-md border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Analytics</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalLikes.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalFollowers.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Videos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalVideos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
            <CardDescription>Your most viewed content</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topPerformingMedia.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No content uploaded yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/upload')}
                >
                  Upload Your First Video
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topPerformingMedia.map((media, index) => (
                  <div 
                    key={media.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/idea/${media.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium line-clamp-1">{media.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(media.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <Eye className="h-3 w-3" />
                        {media.views_count.toLocaleString()}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Heart className="h-3 w-3" />
                        {media.likes_count}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {media.comments_count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Overview</CardTitle>
            <CardDescription>How your audience interacts with your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analytics.totalViews > 0 ? ((analytics.totalLikes / analytics.totalViews) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Like Rate</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analytics.totalViews > 0 ? ((analytics.totalComments / analytics.totalViews) * 100).toFixed(1) : 0}%
                </div>
                <p className="text-sm text-muted-foreground">Comment Rate</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {analytics.totalViews > 0 ? (analytics.totalViews / (analytics.topPerformingMedia.length || 1)).toFixed(0) : 0}
                </div>
                <p className="text-sm text-muted-foreground">Avg Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}