'use client';

import { useState, useCallback } from 'react';
import { PHQ9_ITEMS, GAD7_ITEMS } from '@life-design/core';
import { scorePHQ9, scoreGAD7 } from '@life-design/core';
import { ScreeningDisclaimer } from './screening-disclaimer';

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
] as const;

interface ClinicalScreeningFormProps {
  instrument: 'phq9' | 'gad7';
  onComplete: (score: ReturnType<typeof scorePHQ9> | ReturnType<typeof scoreGAD7>) => void;
  onCriticalFlag: () => void;
  className?: string;
}

export function ClinicalScreeningForm({
  instrument,
  onComplete,
  onCriticalFlag,
  className,
}: ClinicalScreeningFormProps) {
  const items = instrument === 'phq9' ? PHQ9_ITEMS : GAD7_ITEMS;
  const [responses, setResponses] = useState<Record<string, number>>({});

  const allAnswered = items.every((item) => responses[item.id] !== undefined);

  const handleChange = useCallback(
    (itemId: string, value: number, index: number) => {
      setResponses((prev) => ({ ...prev, [itemId]: value }));

      // PHQ-9 item 9 (index 8, 0-based) critical flag for suicidal ideation
      if (instrument === 'phq9' && index === 8 && value > 0) {
        onCriticalFlag();
      }
    },
    [instrument, onCriticalFlag],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!allAnswered) return;

      const result = instrument === 'phq9' ? scorePHQ9(responses) : scoreGAD7(responses);
      onComplete(result);
    },
    [allAnswered, instrument, responses, onComplete],
  );

  return (
    <form onSubmit={handleSubmit} className={className}>
      <ScreeningDisclaimer />

      <div className="mt-6 space-y-8">
        {items.map((item, index) => {
          const questionId = `question-${item.id}`;
          return (
            <fieldset
              key={item.id}
              role="radiogroup"
              aria-labelledby={questionId}
              className="space-y-3"
            >
              <legend id={questionId} className="text-sm font-medium text-stone-800">
                {index + 1}. {item.text}
              </legend>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RESPONSE_OPTIONS.map((option) => {
                  const inputId = `${item.id}-${option.value}`;
                  const isSelected = responses[item.id] === option.value;
                  return (
                    <label
                      key={option.value}
                      htmlFor={inputId}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? 'border-sage-600 bg-sage-50 text-sage-800'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type="radio"
                        role="radio"
                        id={inputId}
                        name={item.id}
                        value={option.value}
                        checked={isSelected}
                        onChange={() => handleChange(item.id, option.value, index)}
                        aria-label={option.label}
                        className="sr-only"
                      />
                      <span
                        className={`inline-block h-4 w-4 shrink-0 rounded-full border-2 ${
                          isSelected
                            ? 'border-sage-600 bg-sage-600'
                            : 'border-stone-300 bg-white'
                        }`}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="mt-8">
        <button
          type="submit"
          disabled={!allAnswered}
          className="rounded-lg bg-sage-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit Screening
        </button>
      </div>
    </form>
  );
}
