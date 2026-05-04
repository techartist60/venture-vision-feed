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
          {/* invisible elliptical motion paths (used by <animateMotion>) */}
          <path id="atom-path-1" d="M 50,50 m -42,0 a 42,16 0 1,0 84,0 a 42,16 0 1,0 -84,0" />
          <path id="atom-path-2" d="M 50,50 m -42,0 a 42,16 0 1,0 84,0 a 42,16 0 1,0 -84,0" />
          <path id="atom-path-3" d="M 50,50 m -42,0 a 42,16 0 1,0 84,0 a 42,16 0 1,0 -84,0" />
        </defs>

        {/* particle 1 */}
        <g transform="rotate(0 50 50)">
          <circle r="3.2" className="atom-particle">
            <animateMotion dur="2.4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#atom-path-1" />
            </animateMotion>
          </circle>
        </g>

        {/* particle 2 */}
        <g transform="rotate(60 50 50)">
          <circle r="2.8" className="atom-particle atom-particle-alt">
            <animateMotion dur="2.9s" repeatCount="indefinite" rotate="auto" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
              <mpath href="#atom-path-2" />
            </animateMotion>
          </circle>
        </g>

        {/* particle 3 */}
        <g transform="rotate(120 50 50)">
          <circle r="3" className="atom-particle">
            <animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto">
              <mpath href="#atom-path-3" />
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
