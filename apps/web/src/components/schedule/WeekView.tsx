'use client';

import { dimensionPalettes, BarStack, type BarSegment } from '@life-design/ui';
import type { DBScheduleBlock } from '@/lib/db/schema';
import type { Dimension } from '@life-design/core';

interface WeekViewProps {
  blocksByDate: Record<string, DBScheduleBlock[]>;
  weekDates: string[];
}

function computeSegments(blocks: DBScheduleBlock[]): BarSegment[] {
  const map = new Map<Dimension, number>();
  blocks.forEach(b => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    map.set(b.dimension, (map.get(b.dimension) ?? 0) + hours);
  });
  return Array.from(map.entries()).map(([dimension, hours]) => ({ dimension, hours }));
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekView({ blocksByDate, weekDates }: WeekViewProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDates.map((date, i) => {
        const blocks = blocksByDate[date] ?? [];
        const segments = computeSegments(blocks);
        const day = new Date(date + 'T00:00').getDate();
        const isToday = date === new Date().toISOString().split('T')[0];

        return (
          <div key={date} className="space-y-2">
            <div className="text-center">
              <p className="text-[11px] text-stone-500 font-medium">{DAYS[i]}</p>
              <p className={`text-sm font-mono font-semibold ${isToday ? 'text-sage-600' : 'text-stone-700'}`}>{day}</p>
            </div>
            <div className="space-y-1">
              {blocks.slice(0, 4).map(b => (
                <div key={b.id} className="h-1.5 rounded-full" style={{ backgroundColor: dimensionPalettes[b.dimension].accent }} />
              ))}
            </div>
            {segments.length > 0 && <BarStack segments={segments} className="h-5" />}
          </div>
        );
      })}
    </div>
  );
}
