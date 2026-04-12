'use client';

import { useState, useCallback } from 'react';
import {
  PHQ9_QUESTIONS,
  GAD7_QUESTIONS,
  WHO5_QUESTIONS,
  scorePHQ9Screening,
  scoreGAD7Screening,
  scoreWHO5,
  CLINICAL_DISCLAIMER,
  type ScreeningResult,
  type ScreeningQuestion,
} from '@life-design/core';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClinicalScreeningFormProps {
  instrument: 'phq9' | 'gad7' | 'who5';
  onComplete: (result: ScreeningResult) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuestions(instrument: ClinicalScreeningFormProps['instrument']): ScreeningQuestion[] {
  switch (instrument) {
    case 'phq9':
      return PHQ9_QUESTIONS;
    case 'gad7':
      return GAD7_QUESTIONS;
    case 'who5':
      return WHO5_QUESTIONS;
  }
}

function score(instrument: ClinicalScreeningFormProps['instrument'], answers: number[]): ScreeningResult {
  switch (instrument) {
    case 'phq9':
      return scorePHQ9Screening(answers);
    case 'gad7':
      return scoreGAD7Screening(answers);
    case 'who5':
      return scoreWHO5(answers);
  }
}

const INSTRUMENT_LABELS: Record<string, string> = {
  phq9: 'PHQ-9 Depression Screening',
  gad7: 'GAD-7 Anxiety Screening',
  who5: 'WHO-5 Wellbeing Index',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClinicalScreeningForm({
  instrument,
  onComplete,
  className,
}: ClinicalScreeningFormProps) {
  const questions = getQuestions(instrument);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null),
  );
  const [submitting, setSubmitting] = useState(false);

  const question = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;
  const currentAnswer = answers[currentStep];

  const handleSelect = useCallback(
    (value: number) => {
      setAnswers((prev) => {
        const next = [...prev];
        next[currentStep] = value;
        return next;
      });
    },
    [currentStep],
  );

  const handleNext = useCallback(() => {
    if (currentAnswer === null) return;
    if (!isLastStep) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentAnswer, isLastStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (answers.some((a) => a === null)) return;
    setSubmitting(true);

    const numericAnswers = answers as number[];
    const result = score(instrument, numericAnswers);

    // Save to API (only phq9/gad7 — the DB table only supports those)
    if (instrument === 'phq9' || instrument === 'gad7') {
      try {
        await fetch('/api/screening', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instrument, answers: numericAnswers }),
        });
      } catch {
        // Non-blocking: still show result even if save fails
      }
    }

    setSubmitting(false);
    onComplete(result);
  }, [answers, instrument, onComplete]);

  return (
    <div className={className}>
      {/* Header */}
      <h3 className="text-lg font-medium text-stone-800 mb-2">
        {INSTRUMENT_LABELS[instrument]}
      </h3>

      {/* Disclaimer */}
      <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-500 mb-6">
        {CLINICAL_DISCLAIMER}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-stone-400">
          Question {currentStep + 1} of {questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-4 rounded-full transition-colors ${
                i < currentStep
                  ? 'bg-sage-500'
                  : i === currentStep
                    ? 'bg-sage-400'
                    : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-sm font-medium text-stone-800 mb-4">{question.text}</p>

        <div className="space-y-2">
          {question.options.map((option) => {
            const isSelected = currentAnswer === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                  isSelected
                    ? 'border-sage-500 bg-sage-50 text-sage-800 shadow-sm'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span
                  className={`inline-block mr-3 h-4 w-4 rounded-full border-2 align-middle ${
                    isSelected
                      ? 'border-sage-500 bg-sage-500'
                      : 'border-stone-300 bg-white'
                  }`}
                />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="text-sm text-stone-400 hover:text-stone-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
        >
          Back
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={currentAnswer === null || submitting}
            className="rounded-lg bg-sage-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={currentAnswer === null}
            className="rounded-lg bg-sage-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
