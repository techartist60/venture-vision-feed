import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const YOUTUBE_VIDEO_ID = 'm3kR2KK8TEs';
const AUTO_DISMISS_MS = 6000;

export default function ArtemisLivePopup() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const alreadySeen = sessionStorage.getItem('artemis-popup-seen');
    if (alreadySeen) {
      setDismissed(true);
      return;
    }
    const showTimer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setDismissed(true), 400);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, dismissed]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('artemis-popup-seen', 'true');
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
  }, []);

  const handleExpand = useCallback(() => {
    sessionStorage.setItem('artemis-popup-seen', 'true');
    navigate('/idea/artemis-live');
  }, [navigate]);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 transition-all duration-400",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Card */}
      <div
        onClick={handleExpand}
        className={cn(
          "relative z-10 w-full max-w-sm cursor-pointer rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-[hsl(240,20%,12%)] via-[hsl(250,25%,15%)] to-[hsl(220,30%,10%)]",
          "shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7),0_0_40px_-8px_rgba(120,80,255,0.15)]",
          "border border-white/10",
          "transform transition-all duration-500 ease-out",
          visible ? "translate-y-0 scale-100" : "translate-y-8 scale-95"
        )}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Live badge + Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </span>
            <span className="text-white/40 text-[10px] font-medium">NASA</span>
          </div>
          <h3 className="text-white font-bold text-base leading-tight">🚀 Artemis Live</h3>
          <p className="text-white/50 text-xs mt-0.5">Live from NASA</p>
        </div>

        {/* Video */}
        <div className="relative w-full aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
            title="Artemis Live"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-white/40 text-[10px]">Tap to expand</span>
          <span className="text-white/30 text-[10px]">idestrim.com</span>
        </div>
      </div>
    </div>
  );
}
