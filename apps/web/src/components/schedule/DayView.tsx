'use client';

import { dimensionPalettes } from '@life-design/ui';
import { DIMENSION_LABELS } from '@life-design/core';
import type { DBScheduleBlock } from '@/lib/db/schema';

interface DayViewProps {
  blocks: DBScheduleBlock[];
  date: string;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - 6) * 60 + m) / (16 * 60) * 100; // % of 6am–10pm range
}

export function DayView({ blocks, date }: DayViewProps) {
  const now = new Date();
  const isToday = date === now.toISOString().split('T')[0];
  const nowY = isToday ? timeToY(`${now.getHours()}:${now.getMinutes()}`) : -1;

  return (
    <div className="relative" style={{ minHeight: '680px' }}>
      {/* Hour lines */}
      {HOURS.map(h => (
        <div key={h} className="absolute w-full flex items-center" style={{ top: `${((h - 6) / 16) * 100}%` }}>
          <span className="text-[11px] text-stone-500 w-12 shrink-0 text-right pr-3 font-mono">
            {h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}
          </span>
          <div className="flex-1 border-t border-stone-200" />
        </div>
      ))}

      {/* Current time indicator */}
      {isToday && nowY >= 0 && nowY <= 100 && (
        <div className="absolute w-full flex items-center z-10" style={{ top: `${nowY}%` }}>
          <span className="text-[11px] font-bold text-[#CC3333] w-12 text-right pr-2">NOW</span>
          <div className="flex-1 border-t-2 border-[#CC3333]" />
          <div className="w-2 h-2 rounded-full bg-[#CC3333] -ml-1" />
        </div>
      )}

      {/* Schedule blocks */}
      {blocks.map(block => {
        const top = timeToY(block.startTime);
        const bottom = timeToY(block.endTime);
        const height = bottom - top;
        const palette = dimensionPalettes[block.dimension];
        return (
          <div
            key={block.id}
            className="absolute left-14 right-2 rounded-[8px] px-3 py-1.5 overflow-hidden"
            style={{
              top: `${top}%`,
              height: `${Math.max(height, 3)}%`,
              backgroundColor: palette.bg,
              borderLeft: `3px ${block.confirmed ? 'solid' : 'dashed'} ${palette.accent}`,
              opacity: block.confirmed ? 1 : 0.7,
            }}
          >
            <p className={`text-[13px] font-medium truncate ${!block.confirmed ? 'italic' : ''}`} style={{ color: palette.text }}>
              {block.title}
            </p>
            <p className="text-[11px] text-stone-500">
              {DIMENSION_LABELS[block.dimension]} · {block.startTime}–{block.endTime}
            </p>
          </div>
        );
      })}
    </div>
  );
}
