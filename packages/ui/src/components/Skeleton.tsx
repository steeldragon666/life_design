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

export function DimensionGridSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function InsightFeedSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function MentorPanelSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center gap-3 p-4 border-b border-stone-200">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div>
          <Skeleton className="w-24 h-4 mb-1" />
          <Skeleton className="w-16 h-3" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3">
        <Skeleton className="w-3/4 h-12 rounded-2xl" />
        <Skeleton className="w-1/2 h-12 rounded-2xl ml-auto" />
        <Skeleton className="w-2/3 h-12 rounded-2xl" />
      </div>
    </div>
  );
}
