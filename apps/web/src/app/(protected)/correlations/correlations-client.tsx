'use client';

/**
 * Correlation Explorer — Full client component.
 *
 * Three view modes:
 *   Matrix  — 8×8 heatmap of dimension-level correlations
 *   List    — Ranked, filterable correlation cards
 *   Network — SVG force-layout network of dimension nodes
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ALL_DIMENSIONS, DIMENSION_LABELS, Dimension } from '@life-design/core';
import {
  GlassCard,
  DimensionBadge,
  InsightCardDS,
  SectionHeader,
  dimensionColor,
} from '@life-design/ui';
import {
  useCorrelations,
  type CorrelationFilters,
  type CorrelationResult,
} from '@/hooks/useCorrelations';
import {
  GitBranch,
  List,
  Network,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = 'matrix' | 'list' | 'network';

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'matrix', label: 'Matrix', icon: GitBranch },
  { id: 'list', label: 'List', icon: List },
  { id: 'network', label: 'Network', icon: Network },
];

const CAUSAL_BADGE: Record<
  NonNullable<CorrelationResult['causalAssessment']>,
  { label: string; color: string; bg: string }
> = {
  suggestive: {
    label: 'Suggestive',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
  moderate: {
    label: 'Moderate',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
  },
  strong: {
    label: 'Strong',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate per-dimension-pair correlations into a single representative
 * coefficient for the matrix view (mean of absolute values, preserving sign
 * of the strongest correlation).
 */
function buildMatrixData(
  correlations: CorrelationResult[],
): Record<string, Record<string, { coeff: number; count: number; best: CorrelationResult | null }>> {
  const matrix: Record<
    string,
    Record<string, { coeff: number; count: number; best: CorrelationResult | null }>
  > = {};

  for (const dim of ALL_DIMENSIONS) {
    matrix[dim] = {};
    for (const dim2 of ALL_DIMENSIONS) {
      matrix[dim][dim2] = { coeff: 0, count: 0, best: null };
    }
  }

  for (const c of correlations) {
    const d1 = c.dimension1 as Dimension;
    const d2 = c.dimension2 as Dimension;
    if (!matrix[d1] || !matrix[d2]) continue;

    // Update d1→d2
    const cell12 = matrix[d1][d2];
    cell12.count += 1;
    cell12.coeff =
      cell12.count === 1
        ? c.coefficient
        : (cell12.coeff * (cell12.count - 1) + c.coefficient) / cell12.count;
    if (!cell12.best || Math.abs(c.coefficient) > Math.abs(cell12.best.coefficient)) {
      cell12.best = c;
    }

    // Mirror d2→d1 (symmetric)
    if (d1 !== d2) {
      const cell21 = matrix[d2][d1];
      cell21.count += 1;
      cell21.coeff =
        cell21.count === 1
          ? c.coefficient
          : (cell21.coeff * (cell21.count - 1) + c.coefficient) / cell21.count;
      if (!cell21.best || Math.abs(c.coefficient) > Math.abs(cell21.best.coefficient)) {
        cell21.best = c;
      }
    }
  }

  return matrix;
}

/** Hex colour for a correlation cell — positive = green, negative = red. */
function cellColor(coeff: number): string {
  const abs = Math.abs(coeff);
  if (abs < 0.05) return 'rgba(255,255,255,0.03)';
  const opacity = Math.min(abs, 1) * 0.7;
  if (coeff > 0) return `rgba(16,185,129,${opacity})`;
  return `rgba(239,68,68,${opacity})`;
}

/** Short human label for a feature key. */
function featureLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: CorrelationFilters;
  availableDimensions: string[];
  onChange: (f: CorrelationFilters) => void;
}

function FilterBar({ filters, availableDimensions, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const { dimensions = [], minConfidence = 0.5, timePeriod = '90d' } = filters;

  function toggleDimension(dim: string) {
    const next = dimensions.includes(dim)
      ? dimensions.filter((d) => d !== dim)
      : [...dimensions, dim];
    onChange({ ...filters, dimensions: next });
  }

  return (
    <div className="glass-dark rounded-3xl border border-white/5 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-primary-400" />
          <span className="text-sm font-bold text-white">Filters</span>
          {(dimensions.length > 0 || minConfidence !== 0.5 || timePeriod !== '90d') && (
            <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-white/5 pt-4">
          {/* Dimension multi-select */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Dimensions
            </p>
            <div className="flex flex-wrap gap-2">
              {availableDimensions.map((dim) => {
                const active = dimensions.includes(dim);
                const color = dimensionColor(dim);
                return (
                  <button
                    key={dim}
                    onClick={() => toggleDimension(dim)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200 border"
                    style={{
                      backgroundColor: active ? `${color}25` : 'rgba(255,255,255,0.03)',
                      borderColor: active ? `${color}60` : 'rgba(255,255,255,0.06)',
                      color: active ? color : '#64748b',
                    }}
                  >
                    {DIMENSION_LABELS[dim as Dimension] ?? dim}
                  </button>
                );
              })}
              {dimensions.length > 0 && (
                <button
                  onClick={() => onChange({ ...filters, dimensions: [] })}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Confidence slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Min confidence
              </p>
              <span
                className="text-sm font-black text-primary-400"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {Math.round(minConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(minConfidence * 100)}
              onChange={(e) =>
                onChange({ ...filters, minConfidence: parseInt(e.target.value) / 100 })
              }
              className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-primary-500 cursor-pointer"
            />
          </div>

          {/* Time period */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Time period
            </p>
            <div className="flex gap-2">
              {(['30d', '90d', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => onChange({ ...filters, timePeriod: p })}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border ${
                    timePeriod === p
                      ? 'bg-primary-500/20 border-primary-500/40 text-primary-400'
                      : 'border-white/5 text-slate-500 hover:text-white hover:border-white/10'
                  }`}
                >
                  {p === 'all' ? 'All time' : p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix View
// ─────────────────────────────────────────────────────────────────────────────

interface MatrixViewProps {
  correlations: CorrelationResult[];
}

function MatrixView({ correlations }: MatrixViewProps) {
  const [selected, setSelected] = useState<{
    d1: Dimension;
    d2: Dimension;
    data: { coeff: number; count: number; best: CorrelationResult | null };
  } | null>(null);

  const matrix = useMemo(() => buildMatrixData(correlations), [correlations]);

  function handleCellClick(d1: Dimension, d2: Dimension) {
    if (d1 === d2) return;
    const data = matrix[d1]?.[d2];
    if (!data || data.count === 0) return;
    if (selected?.d1 === d1 && selected?.d2 === d2) {
      setSelected(null);
    } else {
      setSelected({ d1, d2, data });
    }
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded-sm bg-emerald-500/60" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded-sm bg-red-500/60" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Negative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-6 rounded-sm bg-white/5" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No signal</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-auto">
          Click a cell to explore
        </span>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th className="w-24 pb-2" />
              {ALL_DIMENSIONS.map((col) => (
                <th key={col} className="pb-2 px-1">
                  <div
                    className="text-[9px] font-black uppercase tracking-widest text-center"
                    style={{ color: dimensionColor(col) }}
                  >
                    {(DIMENSION_LABELS[col as Dimension] ?? col).slice(0, 6)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_DIMENSIONS.map((rowDim) => (
              <tr key={rowDim}>
                {/* Row label */}
                <td className="pr-3 py-1">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                    style={{ color: dimensionColor(rowDim) }}
                  >
                    {DIMENSION_LABELS[rowDim as Dimension] ?? rowDim}
                  </span>
                </td>

                {ALL_DIMENSIONS.map((colDim) => {
                  const isDiagonal = rowDim === colDim;
                  const cell = matrix[rowDim]?.[colDim];
                  const coeff = cell?.coeff ?? 0;
                  const hasData = (cell?.count ?? 0) > 0;
                  const isSelected = selected?.d1 === rowDim && selected?.d2 === colDim;

                  return (
                    <td key={colDim} className="p-0.5">
                      <button
                        onClick={() => handleCellClick(rowDim as Dimension, colDim as Dimension)}
                        disabled={isDiagonal || !hasData}
                        className={`
                          relative w-full aspect-square rounded-lg transition-all duration-200
                          ${isDiagonal ? 'cursor-default' : hasData ? 'cursor-pointer hover:scale-110 hover:z-10 hover:ring-1 hover:ring-white/20' : 'cursor-default'}
                          ${isSelected ? 'ring-2 ring-white/30 scale-110 z-10' : ''}
                        `}
                        style={{
                          backgroundColor: isDiagonal
                            ? 'rgba(255,255,255,0.06)'
                            : cellColor(coeff),
                          minWidth: 36,
                          minHeight: 36,
                        }}
                        title={
                          isDiagonal
                            ? rowDim
                            : hasData
                            ? `${DIMENSION_LABELS[rowDim as Dimension]} ↔ ${
                                DIMENSION_LABELS[colDim as Dimension]
                              }: r=${coeff.toFixed(2)}`
                            : 'No data'
                        }
                      >
                        {isDiagonal && (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-[8px] font-black uppercase"
                            style={{ color: dimensionColor(rowDim) }}
                          >
                            {(DIMENSION_LABELS[rowDim as Dimension] ?? rowDim).slice(0, 3)}
                          </div>
                        )}
                        {!isDiagonal && hasData && (
                          <div
                            className="absolute inset-0 flex items-center justify-center text-[9px] font-black"
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              color: 'rgba(255,255,255,0.85)',
                            }}
                          >
                            {coeff > 0 ? '+' : ''}
                            {coeff.toFixed(2).replace('0.', '.')}
                          </div>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && selected.data.best && (
        <div
          className="mt-4 glass-dark rounded-3xl p-6 border border-white/5 animate-in slide-in-from-bottom-4 duration-300"
          style={{ borderColor: `${dimensionColor(selected.d1)}30` }}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <DimensionBadge dimension={selected.d1} size="md" />
              <span className="text-slate-500 text-sm font-bold">↔</span>
              <DimensionBadge dimension={selected.d2} size="md" />
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-500 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[
              {
                label: 'Coefficient',
                val: selected.data.best.coefficient.toFixed(3),
              },
              {
                label: 'Confidence',
                val: `${Math.round(selected.data.best.confidence * 100)}%`,
              },
              {
                label: 'Sample size',
                val: selected.data.best.sampleSize.toString(),
              },
              {
                label: 'Lag',
                val:
                  selected.data.best.lagDays != null
                    ? `${selected.data.best.lagDays}d`
                    : 'Same day',
              },
            ].map(({ label, val }) => (
              <div key={label} className="glass rounded-2xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  {label}
                </p>
                <p
                  className="text-lg font-black text-white"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  {val}
                </p>
              </div>
            ))}
          </div>

          <p
            className="text-sm text-slate-300 leading-relaxed mb-4"
            style={{ fontFamily: '"Erode", Georgia, serif' }}
          >
            {selected.data.best.narrative}
          </p>

          <div className="flex items-center gap-3">
            {selected.data.best.causalAssessment && (
              <span
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full"
                style={{
                  backgroundColor:
                    CAUSAL_BADGE[selected.data.best.causalAssessment].bg,
                  color: CAUSAL_BADGE[selected.data.best.causalAssessment].color,
                }}
              >
                {CAUSAL_BADGE[selected.data.best.causalAssessment].label} causal signal
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-600">
              {selected.data.count} correlation{selected.data.count !== 1 ? 's' : ''} in this pair
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────────────────────

interface ListViewProps {
  correlations: CorrelationResult[];
}

function ListView({ correlations }: ListViewProps) {
  if (correlations.length === 0) {
    return (
      <div className="glass-dark rounded-3xl p-12 text-center border border-white/5">
        <p className="text-slate-500 font-medium">No correlations match your current filters.</p>
        <p className="text-slate-600 text-sm mt-1">Try lowering the confidence threshold.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {correlations.map((c, idx) => {
        const direction: 'up' | 'down' | 'neutral' =
          c.coefficient >= 0.1 ? 'up' : c.coefficient <= -0.1 ? 'down' : 'neutral';

        const headline = `${featureLabel(c.feature1)} ↔ ${featureLabel(c.feature2)}: r = ${c.coefficient > 0 ? '+' : ''}${c.coefficient.toFixed(3)}`;

        const lagInfo =
          c.lagDays != null && c.lagDays > 0
            ? ` (${c.lagDays}-day lag)`
            : '';

        return (
          <div key={c.id} className="group relative">
            {/* Rank badge */}
            <div className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
              <span
                className="text-[9px] font-black text-slate-500"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {idx + 1}
              </span>
            </div>

            <InsightCardDS
              headline={headline + lagInfo}
              body={c.narrative}
              confidence={c.confidence}
              dimension={c.dimension1 as Dimension}
              expandedContent={
                c.causalAssessment
                  ? `Causal signal: ${CAUSAL_BADGE[c.causalAssessment].label}. Sample size: ${c.sampleSize} observations. p-value: ${c.pValue.toFixed(4)}.`
                  : `Sample size: ${c.sampleSize} observations. p-value: ${c.pValue.toFixed(4)}.`
              }
            />

            {/* Dimension pair indicators */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: dimensionColor(c.dimension1) }}
                title={c.dimension1}
              />
              <span className="text-slate-700 text-[8px]">↔</span>
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: dimensionColor(c.dimension2) }}
                title={c.dimension2}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Network View
// ─────────────────────────────────────────────────────────────────────────────

interface NetworkViewProps {
  correlations: CorrelationResult[];
}

function NetworkView({ correlations }: NetworkViewProps) {
  const SVG_SIZE = 520;
  const CENTER = SVG_SIZE / 2;
  const RADIUS = 180;

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);

  // Position 8 nodes in a circle
  const nodePositions = useMemo(() => {
    return ALL_DIMENSIONS.reduce<Record<string, { x: number; y: number }>>(
      (acc, dim, i) => {
        const angle = (i / ALL_DIMENSIONS.length) * 2 * Math.PI - Math.PI / 2;
        acc[dim] = {
          x: CENTER + RADIUS * Math.cos(angle),
          y: CENTER + RADIUS * Math.sin(angle),
        };
        return acc;
      },
      {},
    );
  }, []);

  // Build edges: aggregate correlations per dimension pair
  const edges = useMemo(() => {
    const edgeMap = new Map<
      string,
      { d1: string; d2: string; maxCoeff: number; count: number; best: CorrelationResult }
    >();

    for (const c of correlations) {
      const key = [c.dimension1, c.dimension2].sort().join('___');
      const existing = edgeMap.get(key);
      if (!existing) {
        edgeMap.set(key, {
          d1: c.dimension1,
          d2: c.dimension2,
          maxCoeff: Math.abs(c.coefficient),
          count: 1,
          best: c,
        });
      } else {
        const abs = Math.abs(c.coefficient);
        if (abs > existing.maxCoeff) {
          existing.maxCoeff = abs;
          existing.best = c;
        }
        existing.count += 1;
      }
    }

    return Array.from(edgeMap.values()).filter((e) => e.maxCoeff >= 0.3);
  }, [correlations]);

  // Node size = number of correlations involving that dimension
  const nodeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dim of ALL_DIMENSIONS) counts[dim] = 0;
    for (const c of correlations) {
      counts[c.dimension1] = (counts[c.dimension1] ?? 0) + 1;
      counts[c.dimension2] = (counts[c.dimension2] ?? 0) + 1;
    }
    return counts;
  }, [correlations]);

  const maxCount = Math.max(1, ...Object.values(nodeCounts));

  function nodeRadius(dim: string) {
    const base = 18;
    const scale = nodeCounts[dim] / maxCount;
    return base + scale * 14;
  }

  function edgeStroke(coeff: number): number {
    return 1 + Math.abs(coeff) * 5;
  }

  function edgeColor(c: CorrelationResult): string {
    return c.coefficient >= 0 ? 'rgba(16,185,129,' : 'rgba(239,68,68,';
  }

  function edgeOpacity(coeff: number): number {
    return 0.2 + Math.abs(coeff) * 0.6;
  }

  function handleMouseEnter(
    e: React.MouseEvent<SVGLineElement>,
    edge: (typeof edges)[number],
  ) {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const x1 = nodePositions[edge.d1].x;
    const y1 = nodePositions[edge.d1].y;
    const x2 = nodePositions[edge.d2].x;
    const y2 = nodePositions[edge.d2].y;
    setTooltip({
      x: ((x1 + x2) / 2 / SVG_SIZE) * rect.width + rect.left,
      y: ((y1 + y2) / 2 / SVG_SIZE) * rect.height + rect.top - 40,
      content: `${DIMENSION_LABELS[edge.d1 as Dimension]} ↔ ${
        DIMENSION_LABELS[edge.d2 as Dimension]
      }: r = ${edge.best.coefficient > 0 ? '+' : ''}${edge.best.coefficient.toFixed(2)}`,
    });
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-8 bg-emerald-500/70" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-8 bg-red-500/70" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Negative</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 ml-auto">
          Line weight = strength
        </span>
      </div>

      {/* SVG Network */}
      <div className="glass-dark rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center p-4">
        <svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full max-w-[520px]"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Edges */}
          {edges.map((edge) => {
            const p1 = nodePositions[edge.d1];
            const p2 = nodePositions[edge.d2];
            if (!p1 || !p2) return null;
            const color = `${edgeColor(edge.best)}${edgeOpacity(edge.best.coefficient)})`;
            return (
              <line
                key={`${edge.d1}-${edge.d2}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={edgeStroke(edge.best.coefficient)}
                strokeLinecap="round"
                className="cursor-pointer transition-all hover:opacity-100"
                onMouseEnter={(e) => handleMouseEnter(e, edge)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}

          {/* Nodes */}
          {ALL_DIMENSIONS.map((dim) => {
            const pos = nodePositions[dim];
            if (!pos) return null;
            const r = nodeRadius(dim);
            const color = dimensionColor(dim);
            const label = DIMENSION_LABELS[dim as Dimension] ?? dim;

            return (
              <g key={dim}>
                {/* Glow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 6}
                  fill={`${color}15`}
                />
                {/* Node circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={r}
                  fill={`${color}25`}
                  stroke={`${color}70`}
                  strokeWidth={1.5}
                />
                {/* Inner dot */}
                <circle cx={pos.x} cy={pos.y} r={4} fill={color} />
                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + r + 14}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  fontFamily='"Cabinet Grotesk", system-ui'
                  fontWeight={700}
                >
                  {label.slice(0, 8)}
                </text>
                {/* Count badge */}
                {nodeCounts[dim] > 0 && (
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize={10}
                    fontFamily='"JetBrains Mono", monospace'
                    fontWeight={700}
                  >
                    {nodeCounts[dim]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Fixed-position tooltip (rendered outside SVG) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 glass-dark rounded-xl border border-white/10 text-xs font-bold text-white whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Edge list */}
      {edges.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {edges
            .sort((a, b) => b.maxCoeff - a.maxCoeff)
            .slice(0, 6)
            .map((edge) => (
              <div
                key={`${edge.d1}-${edge.d2}-card`}
                className="glass rounded-2xl p-4 border border-white/5 flex items-center gap-3"
              >
                <div
                  className="h-8 w-1.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      edge.best.coefficient >= 0 ? '#10b981' : '#ef4444',
                  }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {DIMENSION_LABELS[edge.d1 as Dimension]} ↔{' '}
                    {DIMENSION_LABELS[edge.d2 as Dimension]}
                  </p>
                  <p
                    className="text-[10px] font-black text-slate-400 mt-0.5"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    r = {edge.best.coefficient > 0 ? '+' : ''}
                    {edge.best.coefficient.toFixed(3)} · {edge.count} feature
                    {edge.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function CorrelationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="glass-dark rounded-3xl border border-white/5 h-28"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function CorrelationsClient() {
  const [view, setView] = useState<ViewMode>('matrix');
  const [filters, setFilters] = useState<CorrelationFilters>({
    dimensions: [],
    minConfidence: 0.5,
    timePeriod: '90d',
  });

  const { correlations, loading, error, availableDimensions } = useCorrelations(filters);

  // Summary stats
  const stats = useMemo(() => {
    const positive = correlations.filter((c) => c.coefficient >= 0.3).length;
    const negative = correlations.filter((c) => c.coefficient <= -0.3).length;
    const withLag = correlations.filter((c) => c.lagDays != null && c.lagDays > 0).length;
    const withCausal = correlations.filter((c) => c.causalAssessment != null).length;
    return { positive, negative, withLag, withCausal, total: correlations.length };
  }, [correlations]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Page header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            ML Engine · Correlation Analysis
          </span>
        </div>
        <h1
          className="text-4xl font-extrabold text-white tracking-tighter"
          style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
        >
          Correlation <span className="text-gradient-primary">Explorer</span>
        </h1>
        <p
          className="text-slate-400 text-base"
          style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
        >
          Statistically validated patterns discovered across your 8 life dimensions.
          Correlations require p &lt; 0.05 and n &ge; 14 observations.
        </p>
      </div>

      {/* Summary stats */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Total signals',
              value: stats.total,
              color: '#818cf8',
            },
            {
              label: 'Positive',
              value: stats.positive,
              color: '#10b981',
            },
            {
              label: 'Negative',
              value: stats.negative,
              color: '#ef4444',
            },
            {
              label: 'Causal signals',
              value: stats.withCausal,
              color: '#06b6d4',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-dark rounded-3xl p-5 border border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
                {label}
              </p>
              <p
                className="text-3xl font-black"
                style={{ fontFamily: '"JetBrains Mono", monospace', color }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        availableDimensions={availableDimensions}
        onChange={setFilters}
      />

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="glass-dark rounded-2xl p-1.5 flex items-center gap-1 border border-white/5">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  view === tab.id
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-slate-500 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {!loading && (
          <span className="text-xs text-slate-600 font-bold ml-2">
            {stats.total} correlation{stats.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="glass-dark rounded-3xl p-6 border border-red-500/20 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* View content */}
      {loading ? (
        <CorrelationSkeleton />
      ) : (
        <div className="animate-in fade-in duration-300">
          {view === 'matrix' && <MatrixView correlations={correlations} />}
          {view === 'list' && <ListView correlations={correlations} />}
          {view === 'network' && <NetworkView correlations={correlations} />}
        </div>
      )}

      {/* Methodology footer */}
      <GlassCard className="p-6 border-white/5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-primary-400" />
          </div>
          <div className="space-y-1">
            <p
              className="font-bold text-white text-sm"
              style={{ fontFamily: '"Cabinet Grotesk", system-ui, sans-serif' }}
            >
              About these correlations
            </p>
            <p
              className="text-xs text-slate-400 leading-relaxed"
              style={{ fontFamily: '"Erode", Georgia, serif', fontWeight: 300 }}
            >
              Correlations are computed using Pearson and Spearman methods with Bonferroni correction
              for multiple comparisons. Only results with p &lt; 0.05, n &ge; 14, and stability &ge; 0.6
              across rolling windows are surfaced. Causal language is hedged — associations do not
              imply causation. Granger causality tests and cross-convergent mapping provide
              directional evidence only.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
