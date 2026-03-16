import { cn } from '../../utils/cn';

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}

export function ProgressRing({ value, max = 10, size = 44, className }: ProgressRingProps) {
  const r = 15;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="progress-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5A7F5A" />
            <stop offset="100%" stopColor="#9BB89B" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#E8E4DD" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke="url(#progress-grad)" strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold text-stone-900 leading-none">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
        <span className="text-[11px] text-stone-500 mt-0.5">of {max}</span>
      </div>
    </div>
  );
}
