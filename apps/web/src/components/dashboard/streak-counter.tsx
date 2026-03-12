import { Flame } from 'lucide-react';

interface StreakCounterProps {
  streak: number;
}

export default function StreakCounter({ streak }: StreakCounterProps) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 border-white/5 shadow-xl shadow-orange-500/5 transition-all hover:scale-[1.02]">
      <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
        <Flame className={`h-7 w-7 ${streak > 0 ? 'text-orange-500 animate-bounce' : 'text-slate-600'}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-none">{streak}</p>
        <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">
          {streak === 1 ? 'Day Streak' : 'Day Streak'}
        </p>
      </div>
    </div>
  );
}
