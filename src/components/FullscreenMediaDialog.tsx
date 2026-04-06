import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Globe } from 'lucide-react';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '@/utils/youtube';

interface FullscreenMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: 'image' | 'video' | 'youtube' | 'website' | 'text';
  mediaUrl: string;
  title: string;
  thumbnailUrl?: string;
}

export default function FullscreenMediaDialog({
  open,
  onOpenChange,
  mediaType,
  mediaUrl,
  title,
  thumbnailUrl,
}: FullscreenMediaDialogProps) {
  const videoId = mediaType === 'youtube' ? extractYouTubeVideoId(mediaUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none overflow-hidden [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="w-full h-[90vh] flex items-center justify-center">
          {mediaType === 'image' && (
            <img
              src={mediaUrl}
              alt={title}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {mediaType === 'video' && (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-full max-h-full"
              poster={thumbnailUrl}
            />
          )}

          {mediaType === 'youtube' && videoId && (
            <iframe
              src={`${getYouTubeEmbedUrl(videoId)}&autoplay=1`}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {mediaType === 'website' && (
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/20 text-white text-xs">
                <Globe className="h-3.5 w-3.5" />
                <span className="truncate">{mediaUrl}</span>
              </div>
              <iframe
                src={mediaUrl}
                title={title}
                className="flex-1 w-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
