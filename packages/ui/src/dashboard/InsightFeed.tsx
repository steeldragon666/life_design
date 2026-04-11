'use client';

import { cn } from '../utils/cn';
import { Card } from '../components/Card';
import { Lightbulb } from 'lucide-react';

export interface Insight {
  id: string;
  title: string;
  body: string;
  dimension?: string;
  timestamp: string;
}

export interface InsightFeedProps {
  insights: Insight[];
  className?: string;
}

export function InsightFeed({ insights, className }: InsightFeedProps) {
  if (insights.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {insights.map((insight, i) => (
        <Card key={insight.id} className={cn('p-4', `stagger-${Math.min(i + 1, 10)}`)}>
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <Lightbulb size={18} className="text-warm-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-stone-800">{insight.title}</h3>
              <p className="text-sm text-stone-500 mt-1 line-clamp-2">{insight.body}</p>
              <p className="text-xs text-stone-400 mt-2">{insight.timestamp}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
