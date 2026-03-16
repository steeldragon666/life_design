'use client';

import { useState } from 'react';
import {
  GoalHorizon,
  GoalTrackingType,
  ALL_DIMENSIONS,
  DIMENSION_LABELS,
  GOAL_HORIZON_LABELS,
} from '@life-design/core';
import { Button, Input, Textarea, FormField } from '@life-design/ui';

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
      <FormField label="Goal Title">
        <Input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Learn Spanish, Save £10,000, Run a marathon"
          maxLength={200}
          required
        />
      </FormField>

      {/* Description */}
      <FormField label="Description">
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="What does achieving this goal look like?"
          rows={3}
        />
      </FormField>

      {/* Horizon */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-700">Time Horizon</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(GoalHorizon).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setForm({ ...form, horizon: h })}
              className={`rounded-xl border p-2.5 text-sm font-medium transition-all ${
                form.horizon === h
                  ? 'border-sage-500 bg-sage-50 text-sage-700'
                  : 'border-stone-200 hover:border-stone-400 text-stone-700'
              }`}
            >
              {GOAL_HORIZON_LABELS[h]}
            </button>
          ))}
        </div>
      </div>

      {/* Target Date */}
      <FormField label="Target Date">
        <Input
          type="date"
          value={form.targetDate}
          onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          required
        />
      </FormField>

      {/* Dimensions (max 3) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-stone-700">
          Life Dimensions (select 1-3)
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ALL_DIMENSIONS.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => toggleDimension(dim)}
              className={`rounded-xl border p-2 text-xs font-medium transition-all ${
                form.dimensions.includes(dim)
                  ? 'border-sage-500 bg-sage-50 text-sage-700'
                  : form.dimensions.length >= 3
                    ? 'opacity-40 cursor-not-allowed border-stone-200 text-stone-600'
                    : 'border-stone-200 hover:border-stone-400 text-stone-600'
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
        <label className="block text-sm font-medium text-stone-700">How will you track progress?</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, trackingType: GoalTrackingType.Milestone })}
            className={`rounded-xl border p-3 text-left transition-all ${
              form.trackingType === GoalTrackingType.Milestone
                ? 'border-sage-500 bg-sage-50'
                : 'border-stone-200 hover:border-stone-400'
            }`}
          >
            <div className="text-sm font-medium text-stone-800">Milestones</div>
            <div className="text-xs text-stone-500">Qualitative steps to complete</div>
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, trackingType: GoalTrackingType.Metric })}
            className={`rounded-xl border p-3 text-left transition-all ${
              form.trackingType === GoalTrackingType.Metric
                ? 'border-sage-500 bg-sage-50'
                : 'border-stone-200 hover:border-stone-400'
            }`}
          >
            <div className="text-sm font-medium text-stone-800">Metric</div>
            <div className="text-xs text-stone-500">Measurable number to track</div>
          </button>
        </div>
      </div>

      {/* Conditional: Milestones */}
      {form.trackingType === GoalTrackingType.Milestone && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700">Milestones</label>
          <div className="space-y-1.5">
            {form.milestones.map((ms, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-1.5 text-sm bg-white">
                <span className="text-stone-500">{i + 1}.</span>
                <span className="flex-1 text-stone-700">{ms}</span>
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  className="text-stone-500 hover:text-red-500 transition-colors"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={milestoneInput}
              onChange={(e) => setMilestoneInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); } }}
              placeholder="Add a milestone..."
              className="flex-1"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addMilestone}>
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Conditional: Metric */}
      {form.trackingType === GoalTrackingType.Metric && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Target Value">
            <Input
              type="number"
              value={form.metricTarget ?? ''}
              onChange={(e) => setForm({ ...form, metricTarget: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g. 10000"
              min={0}
            />
          </FormField>
          <FormField label="Unit">
            <Input
              type="text"
              value={form.metricUnit ?? ''}
              onChange={(e) => setForm({ ...form, metricUnit: e.target.value || null })}
              placeholder="e.g. GBP, km, hours"
            />
          </FormField>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        variant="primary"
        size="default"
        disabled={submitting}
        className="w-full"
      >
        {submitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );
}
