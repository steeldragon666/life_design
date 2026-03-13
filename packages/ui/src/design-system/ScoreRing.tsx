'use client';

import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  animate?: boolean;
}

/**
 * Circular progress ring (SVG).
 * Score displayed in center with JetBrains Mono.
 * Ring colour: red < 3, amber 3-6, green > 6. Animated fill on mount.
 */
export default function ScoreRing({
  score,
  maxScore = 10,
  size = 100,
  strokeWidth = 8,
  label,
  className = '',
  animate = true,
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(animate ? 0 : score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(animatedScore / maxScore, 1);
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    if (!animate) {
      setAnimatedScore(score);
      return;
    }
    const duration = 800;
    const start = performance.now();
    const from = 0;
    const to = score;

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [score, animate]);

  function getColor(s: number): string {
    if (s < 3) return '#ef4444';
    if (s <= 6) return '#f59e0b';
    return '#10b981';
  }

  const color = getColor(score);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center score */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-lg font-black text-white"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          {animatedScore.toFixed(1)}
        </span>
      </div>
      {label && (
        <span className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}
