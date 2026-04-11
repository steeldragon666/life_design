'use client';

import { OptInTier, TIER_BENEFITS, type TierBenefit } from '@life-design/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<OptInTier, string> = {
  [OptInTier.Basic]: 'Basic',
  [OptInTier.Enhanced]: 'Enhanced',
  [OptInTier.Full]: 'Full',
};

const TIER_DESCRIPTIONS: Record<OptInTier, string> = {
  [OptInTier.Basic]: 'Mood tracking and journalling only',
  [OptInTier.Enhanced]: 'Health sensors, calendar, and integrations',
  [OptInTier.Full]: 'Behavioural, financial, and federated insights',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OptInTierSelectorProps {
  currentTier: OptInTier;
  onTierChange: (tier: OptInTier) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TierCard({
  benefit,
  isSelected,
  onSelect,
}: {
  benefit: TierBenefit;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={[
        'relative block cursor-pointer rounded-xl border-2 p-5 transition-all',
        isSelected
          ? 'border-sage-500 bg-sage-500/5 ring-2 ring-sage-500/20'
          : 'border-stone-200 bg-white hover:border-stone-300',
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
        aria-label={`Select ${TIER_LABELS[benefit.tier]} tier`}
      />

      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <span
          className={[
            'inline-flex h-5 w-5 items-center justify-center rounded-full border-2',
            isSelected
              ? 'border-sage-500 bg-sage-500'
              : 'border-stone-300 bg-white',
          ].join(' ')}
        >
          {isSelected && (
            <span className="block h-2 w-2 rounded-full bg-white" />
          )}
        </span>
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            {TIER_LABELS[benefit.tier]}
          </h3>
          <p className="text-sm text-stone-500">
            {TIER_DESCRIPTIONS[benefit.tier]}
          </p>
        </div>
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
              <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-300" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Gets */}
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-sage-500">
          You get
        </h4>
        <ul className="space-y-1">
          {benefit.gets.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-stone-700"
            >
              <span className="mt-1 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sage-500" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Selected badge */}
      {isSelected && (
        <span className="absolute right-3 top-3 rounded-full bg-sage-500 px-2 py-0.5 text-xs font-medium text-white">
          Current
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OptInTierSelector({
  currentTier,
  onTierChange,
}: OptInTierSelectorProps) {
  return (
    <fieldset>
      <legend className="mb-4 text-lg font-semibold text-stone-900">
        Data sharing tier
      </legend>
      <p className="mb-5 text-sm text-stone-500">
        Choose how much data you share. Higher tiers unlock more personalised
        insights. You can change this at any time.
      </p>
      <div
        className="grid gap-4 sm:grid-cols-1 md:grid-cols-3"
        role="radiogroup"
        aria-label="Data sharing tier selection"
      >
        {TIER_BENEFITS.map((benefit) => (
          <TierCard
            key={benefit.tier}
            benefit={benefit}
            isSelected={currentTier === benefit.tier}
            onSelect={() => onTierChange(benefit.tier)}
          />
        ))}
      </div>
    </fieldset>
  );
}
