import { cn } from '@/lib/utils';

interface AtomLoaderProps {
  size?: number;
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

/**
 * Idestrim branded atom/reaction loader.
 * Pure SVG + CSS, lightweight, GPU-friendly.
 */
export function AtomLoader({ size = 64, className, label, fullScreen }: AtomLoaderProps) {
  const loader = (
    <div
      className={cn('atom-loader inline-flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="atom-svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="atom-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soft glow halo */}
        <circle cx="50" cy="50" r="46" fill="url(#atom-glow)" className="atom-halo" />

        {/* three elliptical orbits — each rotated to form the atom */}
        <g className="atom-orbit atom-orbit-1">
          <ellipse cx="50" cy="50" rx="42" ry="16" />
          <circle className="atom-electron" cx="92" cy="50" r="3.2" />
        </g>
        <g className="atom-orbit atom-orbit-2">
          <ellipse cx="50" cy="50" rx="42" ry="16" />
          <circle className="atom-electron" cx="92" cy="50" r="3.2" />
        </g>
        <g className="atom-orbit atom-orbit-3">
          <ellipse cx="50" cy="50" rx="42" ry="16" />
          <circle className="atom-electron" cx="92" cy="50" r="3.2" />
        </g>

        {/* nucleus */}
        <circle cx="50" cy="50" r="4.5" className="atom-nucleus" />
      </svg>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full bg-gradient-discovery flex items-center justify-center">
        {loader}
      </div>
    );
  }
  return loader;
}

export default AtomLoader;
