import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-semibold rounded-[8px] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-sage-600 text-white shadow-[0_2px_8px_rgba(90,127,90,0.3)] hover:bg-sage-600/90 focus-visible:ring-sage-500/15 active:scale-[0.98]',
        secondary: 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200/60 focus-visible:ring-sage-500/15 active:scale-[0.98]',
        ghost: 'bg-transparent text-sage-500 hover:bg-sage-50 focus-visible:ring-sage-500/15',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/15 active:scale-[0.98]',
      },
      size: {
        sm: 'px-3.5 py-1.5 text-xs',
        default: 'px-5 py-2.5 text-[13px]',
        lg: 'px-7 py-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'default' | 'lg';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export { buttonVariants };
