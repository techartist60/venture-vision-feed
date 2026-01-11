import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VerifiedBadge({ className, size = 'sm' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <CheckCircle 
      className={cn(
        sizeClasses[size],
        "text-primary fill-primary/20",
        className
      )} 
      aria-label="Verified account"
    />
  );
}