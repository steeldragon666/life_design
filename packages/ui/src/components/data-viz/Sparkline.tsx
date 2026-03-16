import type { Dimension } from '@life-design/core';
import { dimensionPalettes } from '../../tokens/dimensions';
import { cn } from '../../utils/cn';

export interface SparklineProps {
  data: number[];
  dimension?: Dimension;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data, dimension, color, width = 120, height = 24, className,
}: SparklineProps) {
  if (data.length < 2) return null;

  const strokeColor = color ?? (dimension ? dimensionPalettes[dimension].accent : '#5A7F5A');
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const lastPoint = points[points.length - 1].split(',');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('inline-block', className)}>
      <polyline points={points.join(' ')} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="3" fill={strokeColor} />
    </svg>
  );
}
