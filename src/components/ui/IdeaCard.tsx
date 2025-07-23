import { Heart, MessageCircle, Share, Bookmark } from 'lucide-react';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';

interface IdeaCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  user: {
    name: string;
    avatar?: string;
    username: string;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
}

export default function IdeaCard({ 
  title, 
  description, 
  category, 
  mediaType, 
  mediaUrl, 
  user, 
  stats,
  isLiked = false,
  isSaved = false 
}: IdeaCardProps) {
  return (
    <div className="bg-card rounded-2xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
      {/* Media */}
      <div className="relative aspect-video bg-muted">
        {mediaType === 'image' ? (
          <img 
            src={mediaUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
            <div className="text-primary-foreground text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-b-[20px] border-b-white border-r-[12px] border-r-transparent transform rotate-90" />
              </div>
              <p className="text-sm opacity-80">Video Content</p>
            </div>
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-background/90 text-foreground">
          {category}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* User Info */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
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
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              <span className="text-xs">{stats.likes}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{stats.comments}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2">
              <Share className="h-4 w-4" />
              <span className="text-xs">{stats.shares}</span>
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            className={cn(
              "hover:text-accent transition-colors",
              isSaved && "text-accent"
            )}
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}