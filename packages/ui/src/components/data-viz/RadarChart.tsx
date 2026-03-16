import { type Dimension, ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { colors } from '../../tokens/colors';

export interface RadarChartProps {
  scores: Partial<Record<Dimension, number>>;
  size?: number;
  className?: string;
}

const GRID_LEVELS = [3.33, 6.67, 10]; // 3 rings at 1/3, 2/3, full

export function RadarChart({ scores, size = 300, className }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38; // leave room for labels
  const labelR = size * 0.48;

  function polarToXY(angle: number, value: number, radius = maxR) {
    const r = (value / 10) * radius;
    const rad = (angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const step = 360 / ALL_DIMENSIONS.length;

  // Build polygon points
  const points = ALL_DIMENSIONS.map((dim, i) => {
    const score = scores[dim] ?? 0;
    const { x, y } = polarToXY(i * step, score);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      {/* Grid rings */}
      {GRID_LEVELS.map((level) => (
        <circle
          key={level}
          cx={cx} cy={cy}
          r={(level / 10) * maxR}
          fill="none"
          stroke={colors.stone[200]}
          strokeWidth="0.5"
          className="grid"
        />
      ))}

      {/* Axis lines */}
      {ALL_DIMENSIONS.map((_, i) => {
        const end = polarToXY(i * step, 10);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={colors.stone[200]} strokeWidth="0.5" />;
      })}

      {/* Data polygon */}
      <polygon
        points={points}
        fill="rgba(90,127,90,0.12)"
        stroke={colors.sage[500]}
        strokeWidth="1.5"
        style={{ transition: 'all 300ms ease' }}
      />

      {/* Vertex dots */}
      {ALL_DIMENSIONS.map((dim, i) => {
        const score = scores[dim] ?? 0;
        const { x, y } = polarToXY(i * step, score);
        return (
          <circle
            key={dim}
            data-dimension={dim}
            cx={x} cy={y} r={4}
            fill={dimensionPalettes[dim].accent}
          />
        );
      })}

      {/* Axis labels */}
      {ALL_DIMENSIONS.map((dim, i) => {
        const { x, y } = polarToXY(i * step, 10, labelR);
        return (
          <text
            key={dim}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={dimensionPalettes[dim].text}
            fontSize="11"
            fontWeight="500"
            fontFamily="'DM Sans', sans-serif"
          >
            {DIMENSION_LABELS[dim]}
          </text>
        );
      })}
    </svg>
  );
}
