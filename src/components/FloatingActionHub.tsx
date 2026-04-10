import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Sparkles, Globe, Radio, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionHubProps {
  onOpenSaidi: () => void;
  onOpenTryIt: () => void;
  onOpenArtemis: () => void;
}

const actions = [
  {
    id: 'saidi',
    label: 'Saidi AI',
    icon: Bot,
    gradient: 'from-primary to-primary/80',
    shadow: 'shadow-[0_2px_12px_-2px_hsl(var(--primary)/0.4)]',
  },
  {
    id: 'explore',
    label: 'Explore Ideas',
    icon: Sparkles,
    gradient: 'from-[hsl(175,70%,40%)] to-[hsl(175,70%,30%)]',
    shadow: 'shadow-[0_2px_12px_-2px_hsl(175,70%,45%,0.4)]',
  },
  {
    id: 'tryit',
    label: 'Try It Now',
    icon: Globe,
    gradient: 'from-blue-600 to-cyan-500',
    shadow: 'shadow-[0_2px_12px_-2px_rgba(59,130,246,0.4)]',
  },
  {
    id: 'artemis',
    label: 'Artemis Live',
    icon: Radio,
    gradient: 'from-red-600 to-red-700',
    shadow: 'shadow-[0_2px_12px_-2px_rgba(220,38,38,0.4)]',
    pulse: true,
  },
];

export default function FloatingActionHub({
  onOpenSaidi,
  onOpenTryIt,
  onOpenArtemis,
}: FloatingActionHubProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const handleAction = useCallback(
    (id: string) => {
      setExpanded(false);
      switch (id) {
        case 'saidi':
          onOpenSaidi();
          break;
        case 'explore':
          navigate('/idescan');
          break;
        case 'tryit':
          onOpenTryIt();
          break;
        case 'artemis':
          onOpenArtemis();
          break;
      }
    },
    [navigate, onOpenSaidi, onOpenTryIt, onOpenArtemis]
  );

  return (
    <div data-fab-hub className="fixed bottom-24 right-4 z-[80] flex flex-col-reverse items-end gap-3">
      {/* Main FAB toggle */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className={cn(
          'h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300',
          'shadow-[0_4px_20px_-4px_rgba(0,0,0,0.3)]',
          expanded
            ? 'bg-foreground text-background rotate-45'
            : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
        )}
        aria-label={expanded ? 'Close menu' : 'Open quick actions'}
      >
        {expanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>

      {/* Action items — fan out upwards */}
      {actions.map((action, i) => (
        <div
          key={action.id}
          className={cn(
            'flex items-center gap-2 transition-all duration-300',
            expanded
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          )}
          style={{
            transitionDelay: expanded ? `${i * 50}ms` : '0ms',
          }}
        >
          {/* Label pill */}
          <span
            className={cn(
              'px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium text-foreground',
              'shadow-sm whitespace-nowrap transition-all duration-200',
              expanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            {action.label}
          </span>

          {/* Icon button */}
          <button
            onClick={() => handleAction(action.id)}
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center text-white',
              `bg-gradient-to-br ${action.gradient} ${action.shadow}`,
              'hover:scale-110 active:scale-95 transition-transform duration-200'
            )}
            aria-label={action.label}
          >
            <action.icon className="h-5 w-5" />
            {action.pulse && (
              <span className="absolute top-0 right-0 h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
            )}
          </button>
        </div>
      ))}

      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setExpanded(false)}
        />
      )}
    </div>
  );
}
