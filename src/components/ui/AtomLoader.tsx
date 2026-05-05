import { cn } from '@/lib/utils';

interface AtomLoaderProps {
  size?: number;
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

/**
 * Idestrim branded atom/reaction loader.
 * Three stationary visible elliptical orbits (0°, 60°, 120°).
 * Glowing particles continuously travel along each orbit.
 */
export function AtomLoader({ size = 64, className, label, fullScreen }: AtomLoaderProps) {
  const ellipsePath =
    'M 50,50 m -42,0 a 42,16 0 1,0 84,0 a 42,16 0 1,0 -84,0';

  const loader = (
    <div
      className={cn(
        'atom-loader inline-flex flex-col items-center justify-center gap-3',
        className
      )}
      role="status"
      aria-label={label || 'Loading'}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="atom-svg"
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        {/* Visible stationary orbits */}
        <g transform="rotate(0 50 50)">
          <ellipse cx="50" cy="50" rx="42" ry="16" className="atom-orbit" />
        </g>
        <g transform="rotate(60 50 50)">
          <ellipse cx="50" cy="50" rx="42" ry="16" className="atom-orbit" />
        </g>
        <g transform="rotate(120 50 50)">
          <ellipse cx="50" cy="50" rx="42" ry="16" className="atom-orbit" />
        </g>

        {/* Particles — stationary group rotation, motion path inline */}
        <g transform="rotate(0 50 50)">
          <circle r="3.4" cx="50" cy="50" className="atom-particle">
            <animateMotion
              dur="2.4s"
              repeatCount="indefinite"
              path={ellipsePath}
              rotate="0"
            />
          </circle>
        </g>
        <g transform="rotate(60 50 50)">
          <circle r="3" cx="50" cy="50" className="atom-particle atom-particle-alt">
            <animateMotion
              dur="2.9s"
              repeatCount="indefinite"
              path={ellipsePath}
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
            />
          </circle>
        </g>
        <g transform="rotate(120 50 50)">
          <circle r="3.2" cx="50" cy="50" className="atom-particle">
            <animateMotion
              dur="3.4s"
              repeatCount="indefinite"
              path={ellipsePath}
            />
          </circle>
        </g>
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
