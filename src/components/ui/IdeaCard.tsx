import { Heart, MessageCircle, Share, Bookmark, Eye, Play, Pause, Mail, Trash2, Shield, FileText, Pencil, Youtube } from 'lucide-react';
import TryItMode from '@/components/TryItMode';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { VerifiedBadge } from './VerifiedBadge';
import { useNavigate } from 'react-router-dom';
import { useVideo } from '@/contexts/VideoContext';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LinkifiedText } from '@/utils/linkDetection';
import EditPostDialog from '@/components/EditPostDialog';
import { extractYouTubeVideoId, getYouTubeEmbedUrl, getYouTubeThumbnail } from '@/utils/youtube';

interface IdeaCardProps {
  id: string;
  title: string;
  description: string;
  category?: string;
  mediaType: 'image' | 'video' | 'text' | 'youtube';
  mediaUrl: string;
  thumbnailUrl?: string;
  user: {
    name: string;
    avatar?: string;
    username: string;
    id?: string;
    isVerified?: boolean;
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  isIdemarked?: boolean;
  isOwner?: boolean;
  currentUserId?: string;
  investmentStatus?: 'open' | 'normal';
  fundingAmount?: number;
  investmentStage?: 'concept' | 'prototype' | 'ready';
  pitchSummary?: string;
  demoUrl?: string;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onMessage?: () => void;
  onDelete?: () => void;
  gridView?: boolean;
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
  isIdemarked = false,
  isOwner = false,
  currentUserId,
  investmentStatus,
  fundingAmount,
  investmentStage,
  pitchSummary,
  onLike,
  onComment,
  onShare,
  onSave,
  onMessage,
  onDelete,
  gridView = false
}: IdeaCardProps) {
  const navigate = useNavigate();
  const { currentlyPlaying, setCurrentlyPlaying, videoRefs } = useVideo();
  const [isPlaying, setIsPlaying] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      videoRefs.current[id] = videoRef.current;
      
      const video = videoRef.current;
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
        delete videoRefs.current[id];
      };
    }
  }, [id, mediaType, videoRefs, setCurrentlyPlaying]);

  useEffect(() => {
    if (mediaType === 'video') {
      setIsPlaying(currentlyPlaying === id);
    }
  }, [currentlyPlaying, id, mediaType]);

  const handleVideoClick = () => {
    if (mediaType !== 'video' || !videoRef.current) return;

    if (currentlyPlaying === id) {
      videoRef.current.pause();
      setCurrentlyPlaying(null);
    } else {
      videoRef.current.play();
      setCurrentlyPlaying(id);
    }
  };

  const handleProfileClick = () => {
    if (user.id) {
      navigate(`/profile/${user.id}`);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/${mediaType === 'video' ? 'video' : 'idea'}/${id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
      onShare?.();
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const fileName = mediaUrl.split('/').pop();
      if (fileName && mediaUrl !== 'text-only') {
        await supabase.storage.from('media').remove([fileName]);
      }

      const { error } = await supabase
        .from('media_uploads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Post deleted successfully');
      onDelete?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  // YouTube grid view (compact card)
  if (gridView) {
    return (
      <div 
        className="bg-card rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-200"
        onClick={() => navigate(`/video/${id}`)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {mediaType === 'video' ? (
            <>
              <img 
                src={thumbnailUrl || mediaUrl} 
                alt={title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://placehold.co/1280x720/333/999?text=Video';
                }}
              />
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                <Eye className="h-3 w-3 inline mr-1" />
                {stats.views > 1000 ? `${(stats.views / 1000).toFixed(1)}K` : stats.views}
              </div>
            </>
          ) : (
            <img 
              src={mediaUrl} 
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/1280x720/333/999?text=Image';
              }}
            />
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            {isIdemarked && (
              <Badge className="bg-primary/90 text-primary-foreground flex items-center gap-1 text-xs">
                <Shield className="h-2.5 w-2.5" />
                Idemarked
              </Badge>
            )}
          </div>
          {investmentStatus === 'open' && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-green-500/90 text-green-50 flex items-center gap-1 text-xs">
                💰 Investment Ready
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex gap-3">
            {/* Avatar */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                handleProfileClick();
              }}
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-1">
                {title}
              </h3>
              <div 
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleProfileClick();
                }}
              >
                {user.name}
                <VerifiedBadge size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {stats.likes > 1000 ? `${(stats.likes / 1000).toFixed(1)}K` : stats.likes}
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {stats.comments}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Text-only idea layout
  if (mediaType === 'text') {
    return (
    <>
      <div className="bg-card rounded-xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
        {/* User Info at top */}
        <div className="p-4 pb-3">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handleProfileClick();
            }}
          >
            <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/20 transition-all">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 hover:opacity-80 transition-opacity">
              <p className="font-semibold text-sm text-foreground flex items-center gap-1">
                {user.name}
                <VerifiedBadge size="sm" />
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{stats.views.toLocaleString()} views</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {category && (
                <Badge className="bg-background/90 text-foreground text-xs">
                  {category}
                </Badge>
              )}
              {isIdemarked && (
                <Badge className="bg-primary/90 text-primary-foreground flex items-center gap-1 text-xs">
                  <Shield className="h-2.5 w-2.5" />
                  Idemarked
                </Badge>
              )}
              {investmentStatus === 'open' && (
                <Badge className="bg-green-500/90 text-green-50 flex items-center gap-1 text-xs">
                  💰 Investment Ready
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Text content with icon */}
        <div className="px-4 pb-4">
          <div className="bg-muted rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10 flex-shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  <LinkifiedText 
                    text={description} 
                    linkClassName="text-primary hover:underline break-all"
                  />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0">
          {/* Investment Ready CTA */}
          {investmentStatus === 'open' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    💰 Investment Opportunity
                  </h4>
                  {fundingAmount && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Seeking ${fundingAmount.toLocaleString()} • {investmentStage}
                    </p>
                  )}
                  {pitchSummary && (
                    <p className="text-xs text-foreground line-clamp-2">
                      {pitchSummary}
                    </p>
                  )}
                </div>
                {!isOwner && onMessage && (
                  <Button 
                    variant="default" 
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage();
                    }}
                  >
                    <Mail className="h-3 w-3" />
                    Contact
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "gap-2 hover:text-red-500 transition-colors p-0 h-auto",
                  isLiked && "text-red-500"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onLike?.();
                }}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                <span className="text-sm">{stats.likes}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 p-0 h-auto" 
                onClick={(e) => {
                  e.stopPropagation();
                  onComment?.();
                }}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{stats.comments}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 p-0 h-auto" 
                onClick={handleShare}
              >
                <Share className="h-5 w-5" />
                <span className="text-sm">Share</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "hover:text-accent transition-colors",
                  isSaved && "text-accent"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <EditPostDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        postId={id}
        currentTitle={title}
        currentDescription={description}
        currentCategory={category}
        onSuccess={onDelete}
      />
    </>
    );
  }

  // YouTube video layout
  if (mediaType === 'youtube') {
    const videoId = extractYouTubeVideoId(mediaUrl);
    return (
      <>
        <div className="bg-card rounded-xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
          {/* User Info at top */}
          <div className="p-4 pb-3">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                handleProfileClick();
              }}
            >
              <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/20 transition-all">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 hover:opacity-80 transition-opacity">
                <p className="font-semibold text-sm text-foreground flex items-center gap-1">
                  {user.name}
                  {user.isVerified && <VerifiedBadge size="sm" />}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{stats.views.toLocaleString()} views</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {category && (
                  <Badge className="bg-background/90 text-foreground text-xs">
                    {category}
                  </Badge>
                )}
                <Badge className="bg-red-600/90 text-white flex items-center gap-1 text-xs">
                  <Youtube className="h-2.5 w-2.5" />
                  YouTube
                </Badge>
                {isIdemarked && (
                  <Badge className="bg-primary/90 text-primary-foreground flex items-center gap-1 text-xs">
                    <Shield className="h-2.5 w-2.5" />
                    Idemarked
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
            {description && (
              <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                <LinkifiedText 
                  text={description} 
                  linkClassName="text-primary hover:underline break-all"
                />
              </p>
            )}
          </div>

          {/* YouTube Embed */}
          <div className="relative w-full aspect-video bg-muted">
            {videoId ? (
              <iframe
                src={getYouTubeEmbedUrl(videoId)}
                title={title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <img 
                src={thumbnailUrl || 'https://placehold.co/1280x720/333/999?text=YouTube'}
                alt={title}
                className="w-full h-full object-cover"
              />
            )}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike?.();
                  }}
                >
                  <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                  <span className="text-sm">{stats.likes}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 p-0 h-auto" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onComment?.();
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm">{stats.comments}</span>
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 p-0 h-auto" 
                  onClick={handleShare}
                >
                  <Share className="h-5 w-5" />
                  <span className="text-sm">Share</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={cn(
                    "hover:text-accent transition-colors",
                    isSaved && "text-accent"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave?.();
                  }}
                >
                  <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <EditPostDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          postId={id}
          currentTitle={title}
          currentDescription={description}
          currentCategory={category}
          onSuccess={onDelete}
        />
      </>
    );
  }
  
  // YouTube-style photo post layout (list view)
  if (mediaType === 'image') {
    return (
    <>
      <div className="bg-card rounded-xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
        {/* User Info at top */}
        <div className="p-4 pb-3">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              handleProfileClick();
            }}
          >
            <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/20 transition-all">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 hover:opacity-80 transition-opacity">
              <p className="font-semibold text-sm text-foreground flex items-center gap-1">
                {user.name}
                <VerifiedBadge size="sm" />
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{stats.views.toLocaleString()} views</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {category && (
                <Badge className="bg-background/90 text-foreground text-xs">
                  {category}
                </Badge>
              )}
              {isIdemarked && (
                <Badge className="bg-primary/90 text-primary-foreground flex items-center gap-1 text-xs">
                  <Shield className="h-2.5 w-2.5" />
                  Idemarked
                </Badge>
              )}
              {investmentStatus === 'open' && (
                <Badge className="bg-green-500/90 text-green-50 flex items-center gap-1 text-xs">
                  💰 Investment Ready
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
            <LinkifiedText 
              text={description} 
              linkClassName="text-primary hover:underline break-all"
            />
          </p>
        </div>

        {/* Photo - Full scale display without max-height */}
        <div className="relative w-full flex items-center justify-center bg-background">
          <img 
            src={mediaUrl} 
            alt={title}
            className="w-full h-auto object-contain"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/1280x720/333/999?text=Image';
            }}
          />
        </div>

        {/* Actions */}
        <div className="p-4">
          {/* Investment Ready CTA */}
          {investmentStatus === 'open' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    💰 Investment Opportunity
                  </h4>
                  {fundingAmount && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Seeking ${fundingAmount.toLocaleString()} • {investmentStage}
                    </p>
                  )}
                  {pitchSummary && (
                    <p className="text-xs text-foreground line-clamp-2">
                      {pitchSummary}
                    </p>
                  )}
                </div>
                {!isOwner && onMessage && (
                  <Button 
                    variant="default" 
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage();
                    }}
                  >
                    <Mail className="h-3 w-3" />
                    Contact
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "gap-2 hover:text-red-500 transition-colors p-0 h-auto",
                  isLiked && "text-red-500"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onLike?.();
                }}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                <span className="text-sm">{stats.likes}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 p-0 h-auto" 
                onClick={(e) => {
                  e.stopPropagation();
                  onComment?.();
                }}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{stats.comments}</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 p-0 h-auto" 
                onClick={handleShare}
              >
                <Share className="h-5 w-5" />
                <span className="text-sm">Share</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "hover:text-accent transition-colors",
                  isSaved && "text-accent"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onSave?.();
                }}
              >
                <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      <EditPostDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        postId={id}
        currentTitle={title}
        currentDescription={description}
        currentCategory={category}
        onSuccess={onDelete}
      />
    </>
    );
  }

  // Video layout - Clicking thumbnail navigates to detail page
  return (
    <>
    <div className="bg-card rounded-2xl shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden">
      {/* Media - Clicking thumbnail goes to video page */}
      <div 
        className="relative aspect-video bg-muted cursor-pointer overflow-hidden"
        onClick={() => navigate(`/video/${id}`)}
      >
        <video 
          ref={videoRef}
          src={mediaUrl} 
          className="w-full h-full object-cover pointer-events-none"
          poster={thumbnailUrl || undefined}
          preload="metadata"
          onError={(e) => {
            const target = e.target as HTMLVideoElement;
            target.poster = 'https://placehold.co/1280x720/333/999?text=Video';
          }}
        >
          Your browser does not support the video tag.
        </video>
        
        {/* Play button overlay - navigates to video page */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all">
          <div className="bg-black/70 rounded-full p-4 hover:bg-black/90 hover:scale-110 transition-all">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          {category && (
            <Badge className="bg-background/90 text-foreground">
              {category}
            </Badge>
          )}
          {isIdemarked && (
            <Badge className="bg-primary/90 text-primary-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Idemarked
            </Badge>
          )}
          {investmentStatus === 'open' && (
            <Badge className="bg-green-500/90 text-green-50 flex items-center gap-1">
              💰 Investment Ready
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* User Info */}
        <div 
          className="flex items-center gap-3 mb-4 cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            handleProfileClick();
          }}
        >
          <Avatar className="h-10 w-10 hover:ring-2 hover:ring-primary/20 transition-all">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hover:opacity-80 transition-opacity">
            <p className="font-semibold text-sm text-foreground flex items-center gap-1">
              {user.name}
              {user.isVerified && <VerifiedBadge size="sm" />}
            </p>
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
          {/* Investment Ready CTA */}
          {investmentStatus === 'open' && (
            <div className="mb-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    💰 Investment Opportunity
                  </h4>
                  {fundingAmount && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Seeking ${fundingAmount.toLocaleString()} • {investmentStage}
                    </p>
                  )}
                  {pitchSummary && (
                    <p className="text-xs text-foreground line-clamp-2">
                      {pitchSummary}
                    </p>
                  )}
                </div>
                {!isOwner && onMessage && (
                  <Button 
                    variant="default" 
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMessage();
                    }}
                  >
                    <Mail className="h-3 w-3" />
                    Contact
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "gap-2 hover:text-red-500 transition-colors",
                isLiked && "text-red-500"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onLike?.();
              }}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              <span className="text-xs">{stats.likes}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2" 
              onClick={(e) => {
                e.stopPropagation();
                onComment?.();
              }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{stats.comments}</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2" 
              onClick={handleShare}
            >
              <Share className="h-4 w-4" />
              <span className="text-xs">Share</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className={cn(
                "hover:text-accent transition-colors",
                isSaved && "text-accent"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSave?.();
              }}
            >
              <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
            </Button>
          </div>
        </div>
      </div>
    </div>
      <EditPostDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        postId={id}
        currentTitle={title}
        currentDescription={description}
        currentCategory={category}
        onSuccess={onDelete}
      />
    </>
  );
}