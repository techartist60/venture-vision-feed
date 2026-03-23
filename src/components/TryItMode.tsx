import { useState, useRef, useCallback, useEffect } from 'react';
import { ExternalLink, Play, AlertTriangle, Loader2, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TryItModeProps {
  demoUrl: string;
  title?: string;
  autoLoad?: boolean;
}

export default function TryItMode({ demoUrl, title }: TryItModeProps) {
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [embedFailed, setEmbedFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const launchDemo = useCallback(() => {
    setShowDemo(true);
    setLoading(true);
    setEmbedFailed(false);

    // Fallback timeout — if iframe doesn't load in 8s, assume blocked
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setEmbedFailed(true);
    }, 8000);
  }, []);

  const handleIframeLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(false);

    // Try to detect X-Frame-Options block (same-origin only)
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc || !doc.body || doc.body.innerHTML === '') {
        setEmbedFailed(true);
      }
    } catch {
      // Cross-origin — can't inspect, but it loaded so it's fine
    }
  }, []);

  const handleIframeError = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoading(false);
    setEmbedFailed(true);
  }, []);

  const openExternal = () => {
    window.open(demoUrl, '_blank', 'noopener,noreferrer');
  };

  const closeDemo = () => {
    setShowDemo(false);
    setLoading(false);
    setEmbedFailed(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">🚀 Try This Idea Live</h3>
          </div>
          {showDemo && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeDemo}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Experience this innovation instantly. No downloads needed.
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {!showDemo ? (
          /* Launch button */
          <div className="text-center py-6">
            <span className="inline-block text-xs font-medium text-green-600 dark:text-green-400 mb-3">
              🟢 Instant Access
            </span>
            <div>
              <Button
                onClick={launchDemo}
                className="gap-2"
                size="sm"
              >
                <Play className="h-4 w-4" />
                Try Live Demo
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 truncate max-w-[250px] mx-auto">
              {demoUrl}
            </p>
          </div>
        ) : embedFailed ? (
          /* Fallback — embedding blocked */
          <div className="text-center py-6 animate-in fade-in duration-300">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-yellow-500/10 mb-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <h4 className="font-semibold text-sm text-foreground mb-1">
              ⚠️ Demo can't be displayed here
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              This experience needs a secure view to run properly.
            </p>
            <Button onClick={openExternal} size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              🔗 Open Live Demo
            </Button>
          </div>
        ) : (
          /* Iframe embed */
          <div className="relative animate-in fade-in duration-500">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">⏳ Launching demo…</span>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={demoUrl}
              title={title || 'Live Demo'}
              className={cn(
                "w-full rounded-lg border border-border",
                loading && "opacity-0"
              )}
              style={{ minHeight: '500px', height: '60vh', maxHeight: '700px' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
