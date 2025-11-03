import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, UserPlus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  media_id?: string;
  content?: string;
  read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name?: string;
    username?: string;
    avatar_url?: string;
  };
  media?: {
    title: string;
  };
}

interface NotificationsListProps {
  onMarkAllAsRead: () => void;
}

export const NotificationsList: React.FC<NotificationsListProps> = ({ onMarkAllAsRead }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

  const fetchNotifications = async () => {
      // First get notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('id, type, media_id, content, read, created_at, actor_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationsError) {
        console.error('Error fetching notifications:', notificationsError);
        setLoading(false);
        return;
      }

      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // Get unique actor IDs
      const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
      
      // Get actor profiles
      const { data: actorsData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, user_id')
        .in('user_id', actorIds);

      // Get unique media IDs
      const mediaIds = notificationsData
        .map(n => n.media_id)
        .filter(Boolean);
      
      // Get media data
      const { data: mediaData } = await supabase
        .from('media_uploads')
        .select('id, title')
        .in('id', mediaIds);

      // Combine data
      const enrichedNotifications: Notification[] = notificationsData.map(notification => {
        const actor = actorsData?.find(a => a.user_id === notification.actor_id);
        const media = mediaData?.find(m => m.id === notification.media_id);
        
        return {
          ...notification,
          type: notification.type as 'like' | 'comment' | 'follow' | 'message',
          actor: {
            id: actor?.user_id || notification.actor_id,
            full_name: actor?.full_name,
            username: actor?.username,
            avatar_url: actor?.avatar_url,
          },
          media: media ? { title: media.title } : undefined,
        };
      });

      setNotifications(enrichedNotifications);
      setLoading(false);
    };

    fetchNotifications();

    // Subscribe to real-time notification updates
    const channel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refetch notifications when a new one arrives
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'follow') {
      navigate(`/profile/${notification.actor.id}`);
    } else if (notification.type === 'message') {
      navigate('/messages');
    } else if (notification.media_id) {
      navigate(`/idea/${notification.media_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-purple-500" fill="currentColor" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actorName = notification.actor.full_name || notification.actor.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your ${notification.media?.title || 'post'}`;
      case 'comment':
        return `${actorName} commented on your ${notification.media?.title || 'post'}`;
      case 'follow':
        return `${actorName} started following you`;
      case 'message':
        return `${actorName} sent you a message`;
      default:
        return 'New notification';
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
          Mark all read
        </Button>
      </div>
      
      <ScrollArea className="h-96">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div
                  className={`flex items-start space-x-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={notification.actor.avatar_url || ''} />
                      <AvatarFallback>
                        {(notification.actor.full_name || notification.actor.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      {getNotificationText(notification)}
                    </p>
                    {(notification.type === 'comment' || notification.type === 'message') && notification.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        "{notification.content}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  )}
                </div>
                {index < notifications.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};