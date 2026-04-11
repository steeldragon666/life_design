import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../utils/cn';

const avatarVariants = cva(
  'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-sage-100 text-sage-600',
  {
    variants: {
      size: {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
);

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-stone-400',
  busy: 'bg-warm-400',
};

const statusSizes: Record<string, string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

function getInitials(alt: string): string {
  const words = alt.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0]?.[0] ?? '').toUpperCase();
}

export interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, size = 'md', status, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span className="font-semibold select-none" aria-label={alt}>
            {getInitials(alt)}
          </span>
        )}
        {status && (
          <span
            data-status={status}
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
              statusColors[status],
              statusSizes[size],
            )}
          />
        )}
      </div>
    );
  },
);

Avatar.displayName = 'Avatar';

export { avatarVariants };
