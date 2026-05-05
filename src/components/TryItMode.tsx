import { useState, useRef, useCallback, useEffect } from 'react';
import { ExternalLink, Play, AlertTriangle, Loader2, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TryItModeProps {
  demoUrl: string;
  title?: string;
  autoLoad?: boolean;
}

export default function TryItMode({ demoUrl, title, autoLoad = false }: TryItModeProps) {
  const [showDemo, setShowDemo] = useState(autoLoad);
  const [loading, setLoading] = useState(autoLoad);
  const [embedFailed, setEmbedFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      timeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 8000);
    }
    return cleanup;
  }, [autoLoad, cleanup]);

  const launchDemo = useCallback(() => {
    setShowDemo(true);
    setLoading(true);
    setEmbedFailed(false);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, 8000);
  }, []);

  const handleIframeLoad = useCallback(() => {
    cleanup();
    setLoading(false);
  }, [cleanup]);

  const handleIframeError = useCallback(() => {
    cleanup();
    setLoading(false);
    setEmbedFailed(true);
  }, [cleanup]);

  const openExternal = () => {
    window.open(demoUrl, '_blank', 'noopener,noreferrer');
  };

  const closeDemo = () => {
    setShowDemo(false);
    setLoading(false);
    setEmbedFailed(false);
    cleanup();
  };

  if (!showDemo) {
    return (
      <div className="text-center py-4">
        <span className="inline-block text-xs font-medium text-primary mb-2">
          🟢 Instant Access
        </span>
        <div>
          <Button onClick={launchDemo} className="gap-2" size="sm">
            <Play className="h-4 w-4" />
            Try Live Demo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 truncate max-w-[250px] mx-auto">
          {demoUrl}
        </p>
      </div>
    );
  }

  if (embedFailed) {
    return (
      <div className="text-center py-4 animate-in fade-in duration-300">
        <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
        <h4 className="font-semibold text-sm text-foreground mb-1">Demo can't be displayed here</h4>
        <p className="text-xs text-muted-foreground mb-3">This website blocks inline viewing. Open it directly instead.</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={openExternal} size="sm" variant="default" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Open Website
          </Button>
          <Button onClick={closeDemo} size="sm" variant="ghost">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative animate-in fade-in duration-500">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10">
          <AtomLoader size={56} label="Launching demo…" />
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span className="truncate max-w-[200px]">{demoUrl}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={openExternal} title="Open in new tab">
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={closeDemo}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={demoUrl}
        title={title || 'Live Demo'}
        className={cn("w-full rounded-lg border border-border", loading && "opacity-0")}
        style={{ minHeight: '400px', height: '50vh', maxHeight: '600px' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
}
