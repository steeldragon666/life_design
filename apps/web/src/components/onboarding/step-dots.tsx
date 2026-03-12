'use client';

import React from 'react';
import { useFlowState, OnboardingStep } from './flow-state';
import { cn } from '@/lib/utils';

interface StepDotsProps {
  className?: string;
}

const steps: { id: OnboardingStep; label: string }[] = [
  { id: 'video', label: 'Welcome' },
  { id: 'theme', label: 'Theme' },
  { id: 'voice', label: 'Voice' },
  { id: 'conversation', label: 'Begin' },
];

export default function StepDots({ className }: StepDotsProps) {
  const { currentStep, goToStep, canGoBack, isVideoComplete } = useFlowState();

  const handleDotClick = (stepId: OnboardingStep) => {
    // Only allow navigation to previous steps (not video if completed)
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) {
      // Can't go back to video once completed
      if (stepId === 'video' && isVideoComplete) return;
      goToStep(stepId);
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
        const isClickable = steps.findIndex(s => s.id === currentStep) > index && 
                           !(step.id === 'video' && isVideoComplete);

        return (
          <React.Fragment key={step.id}>
            {/* Step Dot */}
            <button
              onClick={() => isClickable && handleDotClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'relative group transition-all duration-500 ease-out',
                isClickable ? 'cursor-pointer' : 'cursor-default',
                !isClickable && !isActive && 'opacity-40'
              )}
              aria-label={`Go to ${step.label}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {/* Outer glow ring */}
              <div 
                className={cn(
                  'absolute inset-0 rounded-full transition-all duration-500',
                  isActive 
                    ? 'bg-cyan-400/30 blur-md scale-150 animate-pulse-subtle' 
                    : isCompleted
                    ? 'bg-teal-400/20 scale-125'
                    : 'bg-white/5 scale-100'
                )} 
              />
              
              {/* Main dot */}
              <div 
                className={cn(
                  'relative w-3 h-3 rounded-full transition-all duration-500 ease-out',
                  isActive
                    ? 'bg-gradient-to-br from-cyan-300 to-teal-400 scale-125 shadow-lg shadow-cyan-400/50'
                    : isCompleted
                    ? 'bg-teal-400/80 scale-110'
                    : 'bg-white/20 scale-100'
                )}
              >
                {/* Inner wave animation for active */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-cyan-300/50 animate-ping" />
                )}
                
                {/* Ripple effect on hover */}
                <div className={cn(
                  'absolute inset-0 rounded-full border border-white/30 scale-0 transition-transform duration-300',
                  isClickable && 'group-hover:scale-150'
                )} />
              </div>

              {/* Label tooltip */}
              <span 
                className={cn(
                  'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium tracking-wider uppercase whitespace-nowrap transition-all duration-300',
                  isActive
                    ? 'text-cyan-300 opacity-100 translate-y-0'
                    : 'text-white/40 opacity-0 -translate-y-1 group-hover:opacity-70 group-hover:translate-y-0'
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  'w-8 h-[2px] rounded-full transition-all duration-700 relative overflow-hidden',
                  isCompleted
                    ? 'bg-gradient-to-r from-teal-400/60 to-cyan-400/60'
                    : 'bg-white/10'
                )}
              >
                {/* Wave animation on the line */}
                <div 
                  className={cn(
                    'absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent -translate-x-full',
                    isActive && 'animate-wave-flow'
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Compact version for mobile
export function StepDotsCompact({ className }: StepDotsProps) {
  const { currentStep, progress } = useFlowState();
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1.5">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > steps.findIndex(s => s.id === step.id);
          
          return (
            <div 
              key={step.id}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                isActive
                  ? 'bg-cyan-400 w-6 shadow-lg shadow-cyan-400/30'
                  : isCompleted
                  ? 'bg-teal-400/60'
                  : 'bg-white/20'
              )}
            />
          );
        })}
      </div>
      <span className="text-[10px] text-cyan-300/70 font-medium ml-1">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
