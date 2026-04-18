import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '@/utils/youtube';

interface FullscreenMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: 'image' | 'video' | 'youtube' | 'website' | 'text';
  mediaUrl: string;
  title: string;
  thumbnailUrl?: string;
  images?: string[];
  initialIndex?: number;
  textContent?: string;
}

export default function FullscreenMediaDialog({
  open,
  onOpenChange,
  mediaType,
  mediaUrl,
  title,
  thumbnailUrl,
  images,
  initialIndex = 0,
}: FullscreenMediaDialogProps) {
  const videoId = mediaType === 'youtube' ? extractYouTubeVideoId(mediaUrl) : null;
  const gallery = mediaType === 'image' && images && images.length > 1 ? images : null;
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open || !gallery) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + gallery.length) % gallery.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % gallery.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, gallery]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!gallery) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!gallery || touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setIndex((i) => (i + 1) % gallery.length);
      else setIndex((i) => (i - 1 + gallery.length) % gallery.length);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const currentImage = gallery ? gallery[index] : mediaUrl;

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

        <div
          className="w-full h-[90vh] flex items-center justify-center relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {mediaType === 'image' && (
            <>
              <img
                src={currentImage}
                alt={title}
                className="max-w-full max-h-full object-contain"
              />
              {gallery && (
                <>
                  <button
                    onClick={() => setIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setIndex((i) => (i + 1) % gallery.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
                    {index + 1} / {gallery.length}
                  </div>
                </>
              )}
            </>
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
