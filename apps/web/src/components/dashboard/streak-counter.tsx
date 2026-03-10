interface StreakCounterProps {
  streak: number;
}

export default function StreakCounter({ streak }: StreakCounterProps) {
  const label = streak === 1 ? 'day streak' : 'day streak';

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <span className="text-3xl font-bold">{streak}</span>
      <div className="flex flex-col">
        {streak > 0 && <span className="text-xl">🔥</span>}
        <span className="text-sm text-gray-600">
          {streak} {label}
        </span>
      </div>
    </div>
  );
}
