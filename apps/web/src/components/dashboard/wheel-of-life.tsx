'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Dimension, DIMENSION_LABELS } from '@life-design/core';

interface WheelOfLifeProps {
  scores: { dimension: Dimension | string; score: number }[];
}

export default function WheelOfLife({ scores }: WheelOfLifeProps) {
  if (scores.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center min-h-[300px] text-center p-8">
        <div className="h-12 w-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center mb-4">
          <span className="text-xl">📊</span>
        </div>
        <h3 className="text-xl font-bold text-white">Wheel of Life</h3>
        <p className="text-slate-400 max-w-[200px] mt-2">
          Complete a check-in to visualize your dimensions.
        </p>
      </div>
    );
  }

  const data = scores.map((s) => ({
    dimension: DIMENSION_LABELS[s.dimension as Dimension] ?? s.dimension,
    score: s.score,
    fullMark: 10,
  }));

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-gradient">Wheel of Life</h3>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Balance</span>
      </div>
      
      <div className="relative h-[380px] w-full">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-primary-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} innerRadius="10%" outerRadius="75%">
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis 
              dataKey="dimension" 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }} 
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 10]} 
              tick={false} 
              axisLine={false}
            />
            <Radar
              name="Life Design"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={3}
              fill="url(#radarGradient)"
              fillOpacity={0.6}
            />
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.4} />
              </linearGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
