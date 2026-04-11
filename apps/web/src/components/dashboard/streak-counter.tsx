import { Flame } from 'lucide-react';
import { Card } from '@life-design/ui';

interface StreakCounterProps {
  streak: number;
}

export default function StreakCounter({ streak }: StreakCounterProps) {
  return (
    <Card hoverable className="flex items-center gap-4 p-4">
      <div className="h-12 w-12 rounded-xl bg-warm-100 flex items-center justify-center relative">
        <Flame
          aria-label={streak > 0 ? 'Active streak' : 'No active streak'}
          size={28}
          className={streak > 0 ? 'text-warm-500' : 'text-stone-500'}
        />
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900 leading-none">{streak}</p>
        <p className="text-xs font-medium text-stone-500 mt-1 uppercase tracking-wider">
          Day Streak
        </p>
      </div>
    </Card>
  );
}
