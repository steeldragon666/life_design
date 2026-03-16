'use client';

import React from 'react';
import { useFlowState, OnboardingStep } from './flow-state';
import { cn } from '@/lib/utils';

interface StepDotsProps {
  className?: string;
}

const steps: { id: OnboardingStep; label: string }[] = [
  { id: 'theme', label: 'Theme' },
  { id: 'archetype', label: 'Mentor' },
  { id: 'voice', label: 'Voice' },
  { id: 'conversation', label: 'Begin' },
  { id: 'calendar_connect', label: 'Calendar' },
];

export default function StepDots({ className }: StepDotsProps) {
  const { currentStep, goToStep, isVideoComplete } = useFlowState();

  const handleDotClick = (stepId: OnboardingStep) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    if (stepIndex < currentIndex) {
      if (stepId === 'video' && isVideoComplete) return;
      goToStep(stepId);
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
        const isClickable =
          steps.findIndex(s => s.id === currentStep) > index &&
          !(step.id === 'video' && isVideoComplete);

        return (
          <button
            key={step.id}
            onClick={() => isClickable && handleDotClick(step.id)}
            disabled={!isClickable && !isActive}
            aria-label={`Step ${index + 1}: ${step.label}`}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'rounded-full transition-all duration-300 ease-out',
              isActive
                ? 'bg-sage-600 w-6 h-2'
                : isCompleted
                  ? 'bg-sage-500 w-2 h-2 cursor-pointer'
                  : 'bg-stone-200 w-2 h-2 cursor-default',
            )}
          />
        );
      })}
    </div>
  );
}

// Compact version for mobile — same dot pattern
export function StepDotsCompact({ className }: StepDotsProps) {
  const { currentStep } = useFlowState();

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = steps.findIndex(s => s.id === currentStep) > index;

        return (
          <div
            key={step.id}
            className={cn(
              'rounded-full transition-all duration-300 ease-out',
              isActive
                ? 'bg-sage-600 w-6 h-2'
                : isCompleted
                  ? 'bg-sage-500 w-2 h-2'
                  : 'bg-stone-200 w-2 h-2',
            )}
          />
        );
      })}
    </div>
  );
}
