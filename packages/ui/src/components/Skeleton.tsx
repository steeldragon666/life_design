import { cn } from '../utils/cn';

export interface SkeletonProps { className?: string; }

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('bg-stone-200 rounded-[8px] animate-pulse-skeleton', className)} />;
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-stone-100 rounded-[16px] p-6 space-y-4', className)}>
      <Skeleton className="h-4 w-2/5" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  );
}

export function SparklineSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-6 w-[120px]', className)} />;
}

export function ProgressRingSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-11 w-11 rounded-full', className)} />;
}

export function ScheduleWidgetSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-1 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
