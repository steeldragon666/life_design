'use client';

import { useFlowState, stepOrder } from './flow-state';

export default function ProgressDots() {
  const { currentStep } = useFlowState();
  const currentIdx = stepOrder.indexOf(currentStep);

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-[#A8A198] font-medium">
        Step {currentIdx + 1} of {stepOrder.length}
      </span>
      <div className="flex gap-2">
        {stepOrder.map((step, idx) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx <= currentIdx ? 'bg-[#5A7F5A]' : 'bg-[#E8E4DD]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
