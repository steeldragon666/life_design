'use client';

import { useState } from 'react';
import { ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';

interface Mentor {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface OnboardingClientProps {
  mentors: Mentor[];
  onComplete: () => void;
  onActivateMentor: (mentorId: string) => void;
}

const STEPS = ['welcome', 'dimensions', 'mentors', 'finish'] as const;

export default function OnboardingClient({
  mentors,
  onComplete,
  onActivateMentor,
}: OnboardingClientProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  function handleNext() {
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12 text-center">
      {step === 'welcome' && (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Welcome to Life Design</h1>
          <p className="text-gray-600">
            Track your well-being across 8 life dimensions, get AI-powered
            insights, and grow with personalized mentors.
          </p>
          <button
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      )}

      {step === 'dimensions' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">The 8 Dimensions of Life</h2>
          <p className="text-gray-600">
            Each day, you will rate how you feel across these 8 dimensions.
          </p>
          <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {ALL_DIMENSIONS.map((dim) => (
              <div
                key={dim}
                className="rounded-lg border p-3 text-center text-sm font-medium"
              >
                {DIMENSION_LABELS[dim]}
              </div>
            ))}
          </div>
          <button
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      )}

      {step === 'mentors' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Choose a Mentor</h2>
          <p className="text-gray-600">
            AI mentors offer different perspectives on your journey. Pick one to
            start (you can add more later).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {mentors.map((mentor) => (
              <button
                key={mentor.id}
                onClick={() => onActivateMentor(mentor.id)}
                className="rounded-lg border p-4 text-left hover:border-indigo-500 hover:bg-indigo-50"
              >
                <h3 className="font-semibold">{mentor.name}</h3>
                <p className="text-sm text-gray-500">{mentor.description}</p>
              </button>
            ))}
          </div>
          <button
            onClick={handleNext}
            className="text-sm text-gray-400 hover:underline"
          >
            Next
          </button>
        </div>
      )}

      {step === 'finish' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">You are all set!</h2>
          <p className="text-gray-600">
            Start your first check-in and begin tracking your well-being.
          </p>
          <button
            onClick={onComplete}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            Get Started
          </button>
        </div>
      )}

      <div className="flex justify-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${
              i <= stepIndex ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
