'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  changePercent?: number;
  className?: string;
}

const TREND_CONFIG = {
  up: { arrow: '\u2191', color: 'text-emerald-400' },
  down: { arrow: '\u2193', color: 'text-red-400' },
  neutral: { arrow: '\u2192', color: 'text-slate-400' },
};

/**
 * Compact stat display with label, value, trend arrow, and change percentage.
 * Uses JetBrains Mono for numeric values.
 */
export default function StatCard({
  label,
  value,
  trend = 'neutral',
  changePercent,
  className = '',
}: StatCardProps) {
  const config = TREND_CONFIG[trend];

  return (
    <div
      className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 ${className}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <span
          className="text-2xl font-black text-white"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {value}
        </span>
        {changePercent !== undefined && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${config.color}`}>
            {config.arrow} {Math.abs(changePercent).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
