import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  min: number;
  max: number;
  value: number;
  step?: number;
  labels?: string[];
  onChange: (value: number) => void;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ min, max, value, step = 1, labels, onChange, className, ...props }, ref) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="w-full">
        <input
          ref={ref}
          type="range"
          role="slider"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            'w-full cursor-pointer appearance-none h-2 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-sage-500/15',
            className,
          )}
          style={{
            background: `linear-gradient(to right, var(--color-sage-500) ${percentage}%, var(--color-stone-200) ${percentage}%)`,
          }}
          {...props}
        />
        {labels && labels.length > 0 && (
          <div className="flex justify-between mt-1.5">
            {labels.map((label) => (
              <span key={label} className="text-xs text-stone-500">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  },
);

Slider.displayName = 'Slider';
