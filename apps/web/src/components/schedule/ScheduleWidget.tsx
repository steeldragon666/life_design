'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { db } from '@/lib/db';
import { DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes, BarStack, type BarSegment, ScheduleWidgetSkeleton } from '@life-design/ui';
import { ArrowRight } from 'lucide-react';

export function ScheduleWidget() {
  const today = new Date().toISOString().split('T')[0];

  const blocks = useLiveQuery(
    () => db.scheduleBlocks.where('date').equals(today).sortBy('startTime'),
    [today],
  );

  if (!blocks) return <ScheduleWidgetSkeleton />;

  // Compute time allocation per dimension
  const allocation = new Map<string, number>();
  blocks.forEach(b => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    allocation.set(b.dimension, (allocation.get(b.dimension) ?? 0) + hours);
  });

  const segments: BarSegment[] = Array.from(allocation.entries())
    .map(([dimension, hours]) => ({ dimension: dimension as any, hours }))
    .sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">Today&apos;s Schedule</h3>
        <Link href="/schedule" className="text-[11px] text-sage-500 font-medium flex items-center gap-1 hover:text-sage-600">
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {blocks.length === 0 ? (
        <p className="text-[13px] text-stone-500 italic">No blocks scheduled today</p>
      ) : (
        <div className="space-y-2">
          {blocks.slice(0, 5).map(block => (
            <div key={block.id} className="flex items-center gap-3">
              <div
                className="w-[3px] h-8 rounded-full shrink-0"
                style={{
                  backgroundColor: dimensionPalettes[block.dimension].accent,
                  borderStyle: block.source === 'ai-suggested' ? 'dashed' : 'solid',
                  opacity: block.confirmed ? 1 : 0.7,
                }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-[13px] text-stone-700 truncate ${!block.confirmed ? 'italic' : ''}`}>
                  {block.title}
                </p>
                <p className="text-[11px] text-stone-500">{block.startTime}–{block.endTime}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {segments.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-stone-200">
          <p className="text-[11px] text-stone-500 font-medium">Time Allocation</p>
          <BarStack segments={segments} variant="actual" />
        </div>
      )}
    </div>
  );
}
