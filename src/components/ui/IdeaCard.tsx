import { Heart, MessageCircle, Share, Bookmark, Zap, Eye } from 'lucide-react';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { BoostDialog } from '../BoostDialog';
import { useNavigate } from 'react-router-dom';

interface IdeaCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  user: {
    name: string;
    avatar?: string;
    username: string;
    id?: string;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  isBoosted?: boolean;
  isOwner?: boolean;
  currentUserId?: string;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export default function IdeaCard({ 
  id,
  title, 
  description, 
  category, 
  mediaType, 
  mediaUrl,
  thumbnailUrl, 
  user, 
  stats,
  isLiked = false,
  isSaved = false,
  isBoosted = false,
  isOwner = false,
  currentUserId,
  onLike,
  onComment,
  onShare,
  onSave
}: IdeaCardProps) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user.id) {
      navigate(`/profile/${user.id}`);
    }
  };
  // YouTube-style photo post layout
  if (mediaType === 'image') {
    return (
      <div className="bg-card rounded-xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
        {/* User Info at top */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleProfileClick}>
            <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/20 transition-all">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 hover:opacity-80 transition-opacity">
              <p className="font-semibold text-sm text-foreground">{user.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>@{user.username}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{stats.views.toLocaleString()} views</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Badge className="bg-background/90 text-foreground text-xs">
                {category}
              </Badge>
              {isBoosted && (
                <Badge className="bg-yellow-500/90 text-yellow-50 flex items-center gap-1 text-xs">
                  <Zap className="h-2.5 w-2.5" />
                  Boosted
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Post content */}
        <div className="px-4 pb-3">
          <h3 className="font-bold text-base text-foreground mb-2 line-clamp-2">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Photo */}
        <div className="relative">
          <img 
            src={mediaUrl} 
            alt={title}
            className="w-full max-h-96 object-cover"
          />
        </div>

        {/* Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "gap-2 hover:text-red-500 transition-colors p-0 h-auto",
                  isLiked && "text-red-500"
                )}
                onClick={onLike}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                <span className="text-sm">{stats.likes}</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto" onClick={onComment}>
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{stats.comments}</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="gap-2 p-0 h-auto" onClick={onShare}>
                <Share className="h-5 w-5" />
                <span className="text-sm">{stats.shares}</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <BoostDialog mediaId={id} isOwner={isOwner}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950/20"
                  >
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs">Boost</span>
                  </Button>
                </BoostDialog>
              )}
              
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "hover:text-accent transition-colors",
                  isSaved && "text-accent"
                )}
                onClick={onSave}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Video layout (unchanged)
  return (
    <div className="bg-card rounded-2xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
      {/* Media */}
      <div className="relative aspect-video bg-muted">
        <video 
          src={mediaUrl} 
          controls
          className="w-full h-full object-cover"
          poster={thumbnailUrl}
        >
          Your browser does not support the video tag.
        </video>
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-background/90 text-foreground">
            {category}
          </Badge>
          {isBoosted && (
            <Badge className="bg-yellow-500/90 text-yellow-50 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Boosted
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={handleProfileClick}>
          <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/20 transition-all">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hover:opacity-80 transition-opacity">
            <p className="font-semibold text-sm text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {description}
        </p>

        {/* View Count */}
        <div className="flex items-center gap-1 mb-4 text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span className="text-xs">{stats.views.toLocaleString()} views</span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "gap-2 hover:text-red-500 transition-colors",
                isLiked && "text-red-500"
              )}
              onClick={onLike}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              <span className="text-xs">{stats.likes}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2" onClick={onComment}>
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{stats.comments}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2" onClick={onShare}>
              <Share className="h-4 w-4" />
              <span className="text-xs">{stats.shares}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <BoostDialog mediaId={id} isOwner={isOwner}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 hover:bg-yellow-50 hover:border-yellow-300 dark:hover:bg-yellow-950/20"
                >
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs">Boost</span>
                </Button>
              </BoostDialog>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "hover:text-accent transition-colors",
                isSaved && "text-accent"
              )}
              onClick={onSave}
            >
              <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}