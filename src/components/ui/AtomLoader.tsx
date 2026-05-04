import { cn } from '@/lib/utils';

interface AtomLoaderProps {
  size?: number;
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

/**
 * Idestrim branded atom/reaction loader.
 * Three stationary, INVISIBLE elliptical orbits at fixed rotations (0°, 60°, 120°).
 * Glowing particles travel along each invisible path — their motion alone
 * suggests the presence of the orbit.
 */
export function AtomLoader({ size = 64, className, label, fullScreen }: AtomLoaderProps) {
  // Single ellipse path definition reused for all 3 orbits.
  // Path is intentionally never stroked or filled — only used as <mpath/>.
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
        <defs>
          {/* invisible motion paths — never rendered, only referenced by <mpath/> */}
          <path id="atom-orbit-1" d={ellipsePath} fill="none" stroke="none" />
          <path id="atom-orbit-2" d={ellipsePath} fill="none" stroke="none" />
          <path id="atom-orbit-3" d={ellipsePath} fill="none" stroke="none" />
        </defs>

        {/* Orbit 1 — horizontal (0°) */}
        <g transform="rotate(0 50 50)">
          <circle r="3.4" className="atom-particle">
            <animateMotion dur="2.4s" repeatCount="indefinite">
              <mpath href="#atom-orbit-1" />
            </animateMotion>
          </circle>
        </g>

        {/* Orbit 2 — tilted 60° */}
        <g transform="rotate(60 50 50)">
          <circle r="3" className="atom-particle atom-particle-alt">
            <animateMotion
              dur="2.9s"
              repeatCount="indefinite"
              keyPoints="1;0"
              keyTimes="0;1"
              calcMode="linear"
            >
              <mpath href="#atom-orbit-2" />
            </animateMotion>
          </circle>
        </g>

        {/* Orbit 3 — tilted 120° */}
        <g transform="rotate(120 50 50)">
          <circle r="3.2" className="atom-particle">
            <animateMotion dur="3.4s" repeatCount="indefinite">
              <mpath href="#atom-orbit-3" />
            </animateMotion>
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
