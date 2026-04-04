import { ArrowLeft, ExternalLink, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const YOUTUBE_VIDEO_ID = 'm3kR2KK8TEs';

export default function ArtemisLive() {
  const navigate = useNavigate();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: '🚀 Artemis Live - NASA', url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,20%,8%)] to-[hsl(220,25%,5%)]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-md border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
          <span className="text-white font-semibold text-sm">🚀 Artemis Live</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleShare} className="text-white/70 hover:text-white">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" asChild className="text-white/70 hover:text-white">
            <a href={`https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      {/* Video */}
      <div className="w-full aspect-video max-h-[70vh]">
        <iframe
          src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`}
          title="Artemis Live - NASA"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Info */}
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-white text-xl font-bold">🚀 Artemis Live</h1>
        <p className="text-white/60 text-sm leading-relaxed">
          Watch NASA's Artemis mission live. Experience humanity's return to the Moon in real-time, 
          streamed directly from NASA's mission control.
        </p>
        <div className="flex flex-wrap gap-2">
          {['NASA', 'Space', 'Live', 'Artemis', 'Moon'].map(tag => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
