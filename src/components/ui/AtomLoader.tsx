import { cn } from '@/lib/utils';

interface AtomLoaderProps {
  size?: number;
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

/**
 * Idestrim branded atom/reaction loader.
 * Three stationary visible elliptical orbits at fixed rotations (0°, 60°, 120°).
 * Glowing particles travel along each orbit using CSS motion-path for
 * reliable, smooth animation across browsers.
 */
export function AtomLoader({ size = 64, className, label, fullScreen }: AtomLoaderProps) {
  const loader = (
    <div
      className={cn(
        'atom-loader inline-flex flex-col items-center justify-center gap-3',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
      style={{ ['--atom-size' as any]: `${size}px` }}
    >
      <div
        className="atom-stage"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="atom-svg"
          style={{ overflow: 'visible' }}
        >
          <g transform="rotate(0 50 50)">
            <ellipse cx="50" cy="50" rx="42" ry="16" className="atom-orbit" />
          </g>
          <g transform="rotate(60 50 50)">
            <ellipse cx="50" cy="50" rx="42" ry="16" className="atom-orbit" />
          </g>
          <g transform="rotate(120 50 50)">
            <ellipse cx="50" cy="50" rx="42" ry="16" className="atom-orbit" />
          </g>
        </svg>

        {/* Particles travel along invisible elliptical motion paths */}
        <span className="atom-particle-dot atom-orbit-1" />
        <span className="atom-particle-dot atom-orbit-2" />
        <span className="atom-particle-dot atom-orbit-3" />
      </div>
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
