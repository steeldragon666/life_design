'use client';

import { Card, Badge, Skeleton } from '@life-design/ui';

export interface CorrelationInsight {
  dimensionA: string;
  dimensionB: string;
  coefficient: number;
  lagDays: number;
  confidence: number;
  insightText: string;
}

export type CorrelationStrength = 'weak' | 'moderate' | 'strong';

export function getCorrelationStrength(coefficient: number): CorrelationStrength {
  const absCoefficient = Math.abs(coefficient);
  if (absCoefficient >= 0.7) return 'strong';
  if (absCoefficient >= 0.35) return 'moderate';
  return 'weak';
}

interface CorrelationCardsProps {
  insights: CorrelationInsight[];
  loading?: boolean;
  showEmptyState?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

const STRENGTH_VARIANT: Record<CorrelationStrength, 'stone' | 'accent' | 'success'> = {
  weak: 'stone',
  moderate: 'accent',
  strong: 'success',
};

export default function CorrelationCards({
  insights,
  loading = false,
  showEmptyState = true,
  emptyTitle = 'No correlations yet',
  emptyDescription = 'We will surface cross-dimension patterns as your recent check-ins grow.',
  className,
}: CorrelationCardsProps) {
  if (loading) {
    return (
      <div className={buildContainerClassName(className)}>
        <LoadingCards />
      </div>
    );
  }

  if (insights.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className={buildContainerClassName(className)}>
        <Card className="p-5">
          <p className="text-sm font-semibold text-stone-800">{emptyTitle}</p>
          <p className="mt-1 text-sm text-stone-500">{emptyDescription}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={buildContainerClassName(className)}>
      {insights.map((insight, index) => {
        const strength = getCorrelationStrength(insight.coefficient);
        const relationshipVariant: 'success' | 'warning' =
          insight.coefficient >= 0 ? 'success' : 'warning';

        return (
          <article
            key={buildInsightKey(insight, index)}
            className="group"
          >
            <Card hoverable className="p-5 transition-all duration-300">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Correlation Insight
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={STRENGTH_VARIANT[strength]}>
                    {strength}
                  </Badge>
                  {insight.lagDays !== 0 && (
                    <Badge variant="accent">
                      {formatLagLabel(insight.lagDays)}
                    </Badge>
                  )}
                </div>
              </div>

              <h3 className="mt-3 text-lg font-semibold text-stone-800">
                {insight.dimensionA} ↔ {insight.dimensionB}
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant={relationshipVariant}>
                  r = {formatCoefficient(insight.coefficient)}
                </Badge>
                <Badge variant="stone">
                  Confidence {formatConfidence(insight.confidence)}
                </Badge>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                {insight.insightText}
              </p>
            </Card>
          </article>
        );
      })}
    </div>
  );
}

function LoadingCards() {
  return (
    <>
      {[0, 1].map((slot) => (
        <Card key={`correlation-loading-${slot}`} className="p-5">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="mt-3 h-5 w-52 rounded" />
          <Skeleton className="mt-3 h-4 w-44 rounded" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-11/12 rounded" />
          </div>
        </Card>
      ))}
    </>
  );
}

function formatCoefficient(coefficient: number): string {
  return `${coefficient >= 0 ? '+' : ''}${coefficient.toFixed(2)}`;
}

function formatLagLabel(lagDays: number): string {
  const absoluteDays = Math.abs(lagDays);
  const unit = absoluteDays === 1 ? 'day' : 'days';
  return `${absoluteDays}-${unit} lag`;
}

function formatConfidence(confidence: number): string {
  if (Number.isNaN(confidence)) return 'n/a';
  if (confidence > 1) return `${Math.round(confidence)}%`;
  if (confidence < 0) return 'n/a';
  return `${Math.round(confidence * 100)}%`;
}

function buildContainerClassName(className?: string): string {
  const base = 'grid grid-cols-1 gap-3';
  return className ? `${base} ${className}` : base;
}

function buildInsightKey(insight: CorrelationInsight, index: number): string {
  return `${insight.dimensionA}-${insight.dimensionB}-${insight.lagDays}-${index}`;
}
