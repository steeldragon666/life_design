import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const progressBarVariants = cva('w-full rounded-full overflow-hidden', {
  variants: {
    size: {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    },
    variant: {
      default: 'bg-stone-200',
      sage: 'bg-sage-100',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'default',
  },
});

export { progressBarVariants };

export interface ProgressBarProps extends VariantProps<typeof progressBarVariants> {
  value: number; // 0-100
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, size, variant, className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn(progressBarVariants({ size, variant }), className)}
    >
      <div
        className="h-full rounded-full bg-sage-500 transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
