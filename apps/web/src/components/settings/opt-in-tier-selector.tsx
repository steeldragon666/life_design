'use client';

import { useState, useEffect } from 'react';
import { Shield, Sparkles, Zap, Check } from 'lucide-react';
import { OptInTier, TIER_BENEFITS, type TierBenefit } from '@life-design/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_META: Record<
  OptInTier,
  {
    label: string;
    description: string;
    icon: typeof Shield;
    selectedBorder: string;
    selectedBg: string;
    selectedRing: string;
    iconColor: string;
    badgeBg: string;
  }
> = {
  [OptInTier.Basic]: {
    label: 'Basic',
    description: 'Mood tracking and journalling only',
    icon: Shield,
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50/60',
    selectedRing: 'ring-emerald-500/20',
    iconColor: 'text-stone-500',
    badgeBg: 'bg-stone-600',
  },
  [OptInTier.Enhanced]: {
    label: 'Enhanced',
    description: 'Health sensors, calendar, and integrations',
    icon: Sparkles,
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50/60',
    selectedRing: 'ring-emerald-500/20',
    iconColor: 'text-sage-600',
    badgeBg: 'bg-sage-600',
  },
  [OptInTier.Full]: {
    label: 'Full',
    description: 'Behavioural, financial, and federated insights',
    icon: Zap,
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50/60',
    selectedRing: 'ring-emerald-500/20',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-600',
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OptInTierSelectorProps {
  currentTier: OptInTier;
  onTierChange: (tier: OptInTier) => void;
  /** Compact mode for embedding in onboarding cards */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TierCard({
  benefit,
  isSelected,
  onSelect,
  compact,
}: {
  benefit: TierBenefit;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const meta = TIER_META[benefit.tier];
  const Icon = meta.icon;

  return (
    <label
      className={[
        'relative block cursor-pointer rounded-xl border-2 transition-all',
        compact ? 'p-4' : 'p-5',
        isSelected
          ? `${meta.selectedBorder} ${meta.selectedBg} ring-2 ${meta.selectedRing}`
          : 'border-stone-100 bg-white hover:border-stone-300 hover:shadow-sm',
      ].join(' ')}
    >
      {/* Hidden radio for accessibility */}
      <input
        type="radio"
        name="opt-in-tier"
        value={benefit.tier}
        checked={isSelected}
        onChange={onSelect}
        className="sr-only"
        aria-label={`Select ${meta.label} tier`}
      />

      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <span
          className={[
            'inline-flex h-8 w-8 items-center justify-center rounded-lg',
            isSelected ? 'bg-emerald-100' : 'bg-stone-100',
          ].join(' ')}
        >
          <Icon size={16} className={meta.iconColor} />
        </span>
        <div className="flex-1">
          <h3 className="font-serif text-base font-semibold text-stone-900">
            {meta.label}
          </h3>
          {!compact && (
            <p className="text-xs text-stone-500">{meta.description}</p>
          )}
        </div>
        {isSelected && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
            <Check size={12} className="text-white" strokeWidth={3} />
          </span>
        )}
      </div>

      {/* Shares */}
      <div className="mb-3">
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-400">
          You share
        </h4>
        <ul className="space-y-1">
          {benefit.shares.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-stone-600"
            >
              <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-300" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Gets */}
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-sage-600">
          You get
        </h4>
        <ul className="space-y-1">
          {benefit.gets.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-stone-700"
            >
              <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OptInTierSelector({
  currentTier,
  onTierChange,
  compact = false,
}: OptInTierSelectorProps) {
  return (
    <fieldset>
      {!compact && (
        <>
          <legend className="mb-2 font-serif text-lg font-semibold text-stone-900">
            Data sharing tier
          </legend>
          <p className="mb-5 text-sm text-stone-500">
            Choose how much data you share. Higher tiers unlock more personalised
            insights. You can change this at any time.
          </p>
        </>
      )}
      <div className={compact ? 'space-y-3' : 'grid gap-4 sm:grid-cols-1 md:grid-cols-3'}>
        {TIER_BENEFITS.map((benefit) => (
          <TierCard
            key={benefit.tier}
            benefit={benefit}
            isSelected={currentTier === benefit.tier}
            onSelect={() => onTierChange(benefit.tier)}
            compact={compact}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Self-contained wrapper that manages its own state via the API
// ---------------------------------------------------------------------------

export function OptInTierSelectorWithState() {
  // Beta: all accounts default to Full tier
  const [tier, setTier] = useState<OptInTier>(OptInTier.Full);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch current tier on mount
  useEffect(() => {
    fetch('/api/profile/tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tier && Object.values(OptInTier).includes(data.tier)) {
          setTier(data.tier as OptInTier);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleChange = async (newTier: OptInTier) => {
    const prev = tier;
    setTier(newTier);
    setSaving(true);
    try {
      const res = await fetch('/api/profile/tier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });
      if (!res.ok) setTier(prev);
    } catch {
      setTier(prev);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="py-4 text-center text-sm text-stone-400">
        Loading tier...
      </div>
    );
  }

  return (
    <div className="relative">
      <OptInTierSelector currentTier={tier} onTierChange={handleChange} />
      {saving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60">
          <p className="text-sm text-stone-500">Saving...</p>
        </div>
      )}
    </div>
  );
}
