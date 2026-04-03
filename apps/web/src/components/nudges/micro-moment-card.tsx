'use client';

import Link from 'next/link';
import { BellRinging, Clock } from '@phosphor-icons/react';
import type { MicroMomentNudge } from '@/lib/micro-moments';

interface MicroMomentCardProps {
  nudge: MicroMomentNudge;
}

function formatWindowLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function MicroMomentCard({ nudge }: MicroMomentCardProps) {
  return (
    <div className="rounded-2xl border border-teal-400/20 bg-teal-500/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="h-8 w-8 rounded-lg bg-teal-500/20 flex items-center justify-center mt-0.5">
            <BellRinging size={16} weight="light" className="text-teal-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-teal-100">{nudge.title}</p>
            <p className="text-xs text-teal-300/90 mt-1 leading-relaxed">{nudge.body}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-teal-300/90">
          <Clock size={14} weight="light" />
          Suggestion window {formatWindowLabel(nudge.scheduledForIso)}
        </span>
        <Link href="/checkin" className="text-xs font-semibold text-teal-200 hover:text-teal-100 transition-colors">
          {nudge.actionLabel}
        </Link>
      </div>
    </div>
  );
}
