'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DIMENSION_LABELS } from '@life-design/core';

const WINDOW_OPTIONS = [7, 14, 30, 90] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CHART_COLORS = ['#60a5fa', '#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#f97316'];

type WindowDays = (typeof WINDOW_OPTIONS)[number];

export interface TrendChartScore {
  dimension: string;
  score: number;
}

export interface TrendChartCheckin {
  date: string;
  dimension_scores: TrendChartScore[];
}

export type HighlightedCorrelationPair = readonly [string, string];

interface TrendChartsProps {
  history: TrendChartCheckin[];
  highlightedCorrelationPair?: HighlightedCorrelationPair | null;
  className?: string;
}

interface NormalizedCheckin {
  date: string;
  timestamp: number;
  scoresByDimension: Record<string, number>;
}

interface ChartPoint {
  date: string;
  label: string;
  [dimension: string]: string | number | null;
}

function formatDimensionLabel(dimension: string) {
  const coreLabels = DIMENSION_LABELS as Record<string, string>;
  if (coreLabels[dimension]) return coreLabels[dimension];

  return dimension
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseHistory(history: TrendChartCheckin[]) {
  return history
    .map<NormalizedCheckin | null>((entry) => {
      const timestamp = Date.parse(entry.date);
      if (Number.isNaN(timestamp)) return null;

      const scoresByDimension: Record<string, number> = {};
      for (const score of entry.dimension_scores ?? []) {
        if (typeof score.dimension !== 'string' || score.dimension.length === 0) continue;
        if (typeof score.score !== 'number' || !Number.isFinite(score.score)) continue;
        scoresByDimension[score.dimension] = score.score;
      }

      return {
        date: entry.date,
        timestamp,
        scoresByDimension,
      };
    })
    .filter((entry): entry is NormalizedCheckin => entry !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function buildDefaultSelection(dimensions: string[]) {
  return dimensions.slice(0, Math.min(3, dimensions.length));
}

export default function TrendCharts({
  history,
  highlightedCorrelationPair,
  className,
}: TrendChartsProps) {
  const [windowDays, setWindowDays] = useState<WindowDays>(30);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);

  const normalizedHistory = useMemo(() => parseHistory(history), [history]);

  const availableDimensions = useMemo(() => {
    const dimensions = new Set<string>();
    for (const checkin of normalizedHistory) {
      Object.keys(checkin.scoresByDimension).forEach((dimension) => dimensions.add(dimension));
    }
    return Array.from(dimensions);
  }, [normalizedHistory]);

  const validPair = useMemo(() => {
    if (!highlightedCorrelationPair || highlightedCorrelationPair.length !== 2) return null;
    const [first, second] = highlightedCorrelationPair;
    if (!availableDimensions.includes(first) || !availableDimensions.includes(second)) return null;
    return [first, second] as const;
  }, [availableDimensions, highlightedCorrelationPair]);

  const [overlayPairEnabled, setOverlayPairEnabled] = useState(Boolean(highlightedCorrelationPair));

  useEffect(() => {
    if (validPair && overlayPairEnabled) {
      setSelectedDimensions([validPair[0], validPair[1]]);
      return;
    }

    setSelectedDimensions((current) => {
      const stillAvailable = current.filter((dimension) => availableDimensions.includes(dimension));
      if (stillAvailable.length > 0) return stillAvailable;
      return buildDefaultSelection(availableDimensions);
    });
  }, [availableDimensions, overlayPairEnabled, validPair]);

  useEffect(() => {
    if (!validPair && overlayPairEnabled) {
      setOverlayPairEnabled(false);
    }
  }, [overlayPairEnabled, validPair]);

  const displayedDimensions = useMemo(() => {
    if (validPair && overlayPairEnabled) {
      return [validPair[0], validPair[1]];
    }
    return selectedDimensions.slice(0, 4);
  }, [overlayPairEnabled, selectedDimensions, validPair]);

  const filteredHistory = useMemo(() => {
    if (normalizedHistory.length === 0) return [];

    const latestTimestamp = normalizedHistory[normalizedHistory.length - 1].timestamp;
    const cutoff = latestTimestamp - (windowDays - 1) * DAY_IN_MS;
    return normalizedHistory.filter((checkin) => checkin.timestamp >= cutoff);
  }, [normalizedHistory, windowDays]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

    return filteredHistory.map((checkin) => {
      const point: ChartPoint = {
        date: checkin.date,
        label: formatter.format(new Date(checkin.timestamp)),
      };

      for (const dimension of displayedDimensions) {
        const value = checkin.scoresByDimension[dimension];
        point[dimension] = typeof value === 'number' ? value : null;
      }

      return point;
    });
  }, [displayedDimensions, filteredHistory]);

  const chartWrapperClassName = className
    ? `glass-card rounded-2xl p-5 ${className}`
    : 'glass-card rounded-2xl p-5';

  if (normalizedHistory.length === 0) {
    return (
      <section className={chartWrapperClassName}>
        <h3 className="section-header mb-1">Trend chart</h3>
        <p className="text-sm text-stone-400">
          No check-in history yet. Complete a few check-ins to see trend lines.
        </p>
      </section>
    );
  }

  if (availableDimensions.length === 0) {
    return (
      <section className={chartWrapperClassName}>
        <h3 className="section-header mb-1">Trend chart</h3>
        <p className="text-sm text-stone-400">
          Check-ins are available, but no dimension scores were found for charting.
        </p>
      </section>
    );
  }

  return (
    <section className={chartWrapperClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-header mb-0">Trend chart</h3>
          <p className="text-xs text-stone-500 mt-1">
            Track score changes over time with adjustable windows.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {WINDOW_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setWindowDays(days)}
              className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                windowDays === days
                  ? 'bg-accent-500/20 text-accent-200 border border-accent-500/40'
                  : 'text-stone-300 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
              aria-pressed={windowDays === days}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {validPair && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 p-3">
            <p className="text-xs text-accent-200">
              Highlighted correlation pair:{' '}
              <span className="font-semibold">
                {formatDimensionLabel(validPair[0])} + {formatDimensionLabel(validPair[1])}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setOverlayPairEnabled((current) => !current)}
              className="text-xs rounded-md border border-accent-400/40 px-2.5 py-1 text-accent-200 hover:text-white hover:border-accent-300"
            >
              {overlayPairEnabled ? 'Overlay enabled' : 'Overlay disabled'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {availableDimensions.map((dimension) => {
            const selected = displayedDimensions.includes(dimension);
            const disabled = Boolean(validPair && overlayPairEnabled && !selected);

            return (
              <button
                key={dimension}
                type="button"
                onClick={() => {
                  setSelectedDimensions((current) => {
                    const hasDimension = current.includes(dimension);
                    if (hasDimension) {
                      return current.filter((value) => value !== dimension);
                    }
                    if (current.length >= 4) return [...current.slice(1), dimension];
                    return [...current, dimension];
                  });
                }}
                disabled={disabled}
                className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
                  selected
                    ? 'border-accent-400/50 bg-accent-500/20 text-accent-100'
                    : 'border-white/15 bg-white/5 text-stone-300 hover:text-white hover:bg-white/10'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {formatDimensionLabel(dimension)}
              </button>
            );
          })}
        </div>
      </div>

      {displayedDimensions.length === 0 ? (
        <p className="text-sm text-stone-400 mt-6">
          Select at least one dimension to render trend lines.
        </p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-stone-400 mt-6">
          No data in this window. Try a wider range to include more check-ins.
        </p>
      ) : (
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={24} />
              <YAxis
                domain={[0, 10]}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickCount={6}
                allowDecimals={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.96)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                }}
                labelStyle={{ color: '#cbd5e1', marginBottom: 6 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              {displayedDimensions.map((dimension, index) => (
                <Line
                  key={dimension}
                  type="monotone"
                  dataKey={dimension}
                  name={formatDimensionLabel(dimension)}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2.4}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
