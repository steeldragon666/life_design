'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';
import { DayView } from '@/components/schedule/DayView';
import { WeekView } from '@/components/schedule/WeekView';
import { Card } from '@life-design/ui';

type ViewMode = 'day' | 'week';

function getWeekDates(anchor: Date): string[] {
  const d = new Date(anchor);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day.toISOString().split('T')[0];
  });
}

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>('day');
  const today = new Date().toISOString().split('T')[0];
  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  const allBlocks = useLiveQuery(
    () => db.scheduleBlocks.where('date').between(weekDates[0], weekDates[6], true, true).toArray(),
    [weekDates],
  );

  const todayBlocks = allBlocks?.filter(b => b.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)) ?? [];

  const blocksByDate: Record<string, typeof todayBlocks> = {};
  allBlocks?.forEach(b => {
    (blocksByDate[b.date] ??= []).push(b);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-stone-900">Schedule</h1>
        <div className="flex bg-stone-100 rounded-[8px] p-0.5">
          {(['day', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-[6px] transition-all ${
                view === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        {view === 'day' ? (
          <DayView blocks={todayBlocks} date={today} />
        ) : (
          <WeekView blocksByDate={blocksByDate} weekDates={weekDates} />
        )}
      </Card>
    </div>
  );
}
