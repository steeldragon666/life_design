'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
  XAxis,
} from 'recharts';

interface MilestoneItem {
  id: string;
  title: string;
  position: number;
  completed: boolean;
  completed_at: string | null;
}

interface ProgressEntry {
  id: string;
  metric_value: number | null;
  note: string | null;
  recorded_at: string;
}

interface GoalProgressProps {
  trackingType: 'milestone' | 'metric';
  milestones?: MilestoneItem[];
  progressEntries?: ProgressEntry[];
  metricTarget?: number | null;
  metricCurrent?: number | null;
  metricUnit?: string | null;
  onToggleMilestone?: (milestoneId: string) => void;
  onAddMilestone?: (title: string) => void;
  onLogProgress?: (value: number, note?: string) => void;
}

export default function GoalProgress({
  trackingType,
  milestones = [],
  progressEntries = [],
  metricTarget,
  metricCurrent,
  metricUnit,
  onToggleMilestone,
  onAddMilestone,
  onLogProgress,
}: GoalProgressProps) {
  const [newMilestone, setNewMilestone] = useState('');
  const [logValue, setLogValue] = useState('');
  const [logNote, setLogNote] = useState('');

  if (trackingType === 'milestone') {
    const total = milestones.length;
    const done = milestones.filter((m) => m.completed).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Milestones</h3>
          <span className="text-xs text-gray-500">{done}/{total} completed ({percent}%)</span>
        </div>

        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-indigo-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="space-y-1.5">
          {milestones.map((ms) => (
            <label
              key={ms.id}
              className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer hover:bg-gray-50 ${
                ms.completed ? 'bg-gray-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={ms.completed}
                onChange={() => onToggleMilestone?.(ms.id)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <span className={`text-sm ${ms.completed ? 'line-through text-gray-400' : ''}`}>
                {ms.title}
              </span>
            </label>
          ))}
        </div>

        {onAddMilestone && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMilestone.trim()) {
                  e.preventDefault();
                  onAddMilestone(newMilestone.trim());
                  setNewMilestone('');
                }
              }}
              placeholder="Add milestone..."
              className="flex-1 rounded-lg border p-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (newMilestone.trim()) {
                  onAddMilestone(newMilestone.trim());
                  setNewMilestone('');
                }
              }}
              className="rounded-lg bg-gray-100 px-3 text-sm hover:bg-gray-200"
            >
              Add
            </button>
          </div>
        )}
      </div>
    );
  }

  // Metric mode
  const current = metricCurrent ?? 0;
  const target = metricTarget ?? 1;
  const percent = Math.min(100, Math.round((current / target) * 100));
  const unit = metricUnit ?? '';

  const chartData = progressEntries
    .filter((e) => e.metric_value != null)
    .map((e) => ({
      date: new Date(e.recorded_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      value: e.metric_value,
    }))
    .reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Progress</h3>
        <span className="text-lg font-bold text-indigo-600">
          {current} <span className="text-sm font-normal text-gray-400">/ {target} {unit}</span>
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">{percent}% complete</p>

      {chartData.length > 1 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {onLogProgress && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">Log new value</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={logValue}
              onChange={(e) => setLogValue(e.target.value)}
              placeholder={`Current ${unit}`}
              className="w-28 rounded border p-1.5 text-sm"
              min={0}
            />
            <input
              type="text"
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 rounded border p-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (logValue) {
                  onLogProgress(Number(logValue), logNote || undefined);
                  setLogValue('');
                  setLogNote('');
                }
              }}
              className="rounded bg-indigo-600 px-3 text-sm text-white hover:bg-indigo-700"
            >
              Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
