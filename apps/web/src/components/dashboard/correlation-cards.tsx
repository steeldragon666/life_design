'use client';

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

const STRENGTH_STYLES: Record<CorrelationStrength, string> = {
  weak: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  moderate: 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  strong: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
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
        <div className="correlation-card-reveal rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold text-white">{emptyTitle}</p>
          <p className="mt-1 text-sm text-slate-400">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={buildContainerClassName(className)}>
      {insights.map((insight, index) => {
        const strength = getCorrelationStrength(insight.coefficient);
        const relationshipTone =
          insight.coefficient >= 0 ? 'text-emerald-300' : 'text-rose-300';

        return (
          <article
            key={buildInsightKey(insight, index)}
            className="correlation-card-reveal group rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Correlation Insight
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STRENGTH_STYLES[strength]}`}
                >
                  {strength}
                </span>
                {insight.lagDays !== 0 && (
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                    {formatLagLabel(insight.lagDays)}
                  </span>
                )}
              </div>
            </div>

            <h3 className="mt-3 text-lg font-semibold text-white">
              {insight.dimensionA} ↔ {insight.dimensionB}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-md border border-white/10 px-2 py-1 font-medium ${relationshipTone}`}>
                r = {formatCoefficient(insight.coefficient)}
              </span>
              <span className="rounded-md border border-white/10 px-2 py-1 font-medium text-slate-300">
                Confidence {formatConfidence(insight.confidence)}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {insight.insightText}
            </p>
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
        <div
          key={`correlation-loading-${slot}`}
          className="correlation-card-reveal rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="h-3 w-28 rounded bg-white/10 animate-pulse" />
          <div className="mt-3 h-5 w-52 rounded bg-white/10 animate-pulse" />
          <div className="mt-3 h-4 w-44 rounded bg-white/10 animate-pulse" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-11/12 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
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
  const base = 'correlation-cards-reveal grid grid-cols-1 gap-3';
  return className ? `${base} ${className}` : base;
}

function buildInsightKey(insight: CorrelationInsight, index: number): string {
  return `${insight.dimensionA}-${insight.dimensionB}-${insight.lagDays}-${index}`;
}
