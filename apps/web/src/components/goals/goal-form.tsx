'use client';

import { useState } from 'react';
import {
  GoalHorizon,
  GoalTrackingType,
  ALL_DIMENSIONS,
  DIMENSION_LABELS,
  GOAL_HORIZON_LABELS,
} from '@life-design/core';

export interface GoalFormData {
  title: string;
  description: string;
  horizon: GoalHorizon;
  trackingType: GoalTrackingType;
  targetDate: string;
  metricTarget: number | null;
  metricUnit: string | null;
  dimensions: string[];
  milestones: string[];
}

interface GoalFormProps {
  initialData?: Partial<GoalFormData>;
  onSubmit: (data: GoalFormData) => Promise<{ error?: string | null }>;
  submitLabel?: string;
}

export default function GoalForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Goal',
}: GoalFormProps) {
  const [form, setForm] = useState<GoalFormData>({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    horizon: initialData?.horizon ?? GoalHorizon.Short,
    trackingType: initialData?.trackingType ?? GoalTrackingType.Milestone,
    targetDate: initialData?.targetDate ?? '',
    metricTarget: initialData?.metricTarget ?? null,
    metricUnit: initialData?.metricUnit ?? null,
    dimensions: initialData?.dimensions ?? [],
    milestones: initialData?.milestones ?? [],
  });

  const [milestoneInput, setMilestoneInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDimension(dim: string) {
    setForm((prev) => {
      if (prev.dimensions.includes(dim)) {
        return { ...prev, dimensions: prev.dimensions.filter((d) => d !== dim) };
      }
      if (prev.dimensions.length >= 3) return prev;
      return { ...prev, dimensions: [...prev.dimensions, dim] };
    });
  }

  function addMilestone() {
    if (milestoneInput.trim()) {
      setForm((prev) => ({ ...prev, milestones: [...prev.milestones, milestoneInput.trim()] }));
      setMilestoneInput('');
    }
  }

  function removeMilestone(index: number) {
    setForm((prev) => ({ ...prev, milestones: prev.milestones.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(form);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Goal Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Learn Spanish, Save £10,000, Run a marathon"
          className="w-full rounded-lg border p-2.5 text-sm"
          maxLength={200}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What does achieving this goal look like?"
          className="w-full rounded-lg border p-2.5 text-sm"
          rows={3}
        />
      </div>

      {/* Horizon */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Time Horizon</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(GoalHorizon).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setForm({ ...form, horizon: h })}
              className={`rounded-lg border p-2.5 text-sm font-medium transition-all ${
                form.horizon === h
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'hover:border-gray-400'
              }`}
            >
              {GOAL_HORIZON_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      {/* Target Date */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Target Date</label>
        <input
          type="date"
          value={form.targetDate}
          onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          className="w-full rounded-lg border p-2.5 text-sm"
          required
        />
      </div>

      {/* Dimensions (max 3) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Life Dimensions (select 1-3)
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALL_DIMENSIONS.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => toggleDimension(dim)}
              className={`rounded-lg border p-2 text-xs font-medium transition-all ${
                form.dimensions.includes(dim)
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : form.dimensions.length >= 3
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:border-gray-400'
              }`}
              disabled={!form.dimensions.includes(dim) && form.dimensions.length >= 3}
            >
              {DIMENSION_LABELS[dim]}
            </button>
          ))}
        </div>
      </div>

      {/* Tracking Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">How will you track progress?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, trackingType: GoalTrackingType.Milestone })}
            className={`rounded-lg border p-3 text-left transition-all ${
              form.trackingType === GoalTrackingType.Milestone
                ? 'border-indigo-500 bg-indigo-50'
                : 'hover:border-gray-400'
            }`}
          >
            <div className="text-sm font-medium">Milestones</div>
            <div className="text-xs text-gray-500">Qualitative steps to complete</div>
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, trackingType: GoalTrackingType.Metric })}
            className={`rounded-lg border p-3 text-left transition-all ${
              form.trackingType === GoalTrackingType.Metric
                ? 'border-indigo-500 bg-indigo-50'
                : 'hover:border-gray-400'
            }`}
          >
            <div className="text-sm font-medium">Metric</div>
            <div className="text-xs text-gray-500">Measurable number to track</div>
          </button>
        </div>
      </div>

      {/* Conditional: Milestones */}
      {form.trackingType === GoalTrackingType.Milestone && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Milestones</label>
          <div className="space-y-1.5">
            {form.milestones.map((ms, i) => (
              <div key={i} className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm">
                <span className="text-gray-400">{i + 1}.</span>
                <span className="flex-1">{ms}</span>
                <button type="button" onClick={() => removeMilestone(i)} className="text-red-400 hover:text-red-600">&times;</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={milestoneInput}
              onChange={(e) => setMilestoneInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }}
              placeholder="Add a milestone..."
              className="flex-1 rounded-lg border p-2 text-sm"
            />
            <button type="button" onClick={addMilestone} className="rounded-lg bg-gray-100 px-3 text-sm hover:bg-gray-200">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Conditional: Metric */}
      {form.trackingType === GoalTrackingType.Metric && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Target Value</label>
            <input
              type="number"
              value={form.metricTarget ?? ''}
              onChange={(e) => setForm({ ...form, metricTarget: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g. 10000"
              className="w-full rounded-lg border p-2.5 text-sm"
              min={0}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <input
              type="text"
              value={form.metricUnit ?? ''}
              onChange={(e) => setForm({ ...form, metricUnit: e.target.value || null })}
              placeholder="e.g. GBP, km, hours"
              className="w-full rounded-lg border p-2.5 text-sm"
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
