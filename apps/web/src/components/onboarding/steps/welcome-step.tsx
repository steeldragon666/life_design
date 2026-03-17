'use client';

import { useFlowState } from '../flow-state';

export default function WelcomeStep() {
  const { nextStep } = useFlowState();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F5F3EF]">
      <div className="flex flex-col items-center gap-8 max-w-md text-center">
        {/* Logo mark */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C4D5C4] to-[#5A7F5A] flex items-center justify-center">
          <span className="text-white text-2xl font-['Instrument_Serif']">L</span>
        </div>

        {/* App name */}
        <h1 className="font-['Instrument_Serif'] text-4xl md:text-5xl text-[#1A1816] tracking-tight">
          Life Design
        </h1>

        {/* Tagline */}
        <p className="text-[#7D756A] text-lg leading-relaxed">
          Your personal guide to intentional living. Reflect, grow, and design the life you want.
        </p>

        {/* CTA */}
        <button
          onClick={nextStep}
          className="mt-4 px-8 py-3.5 rounded-xl text-white font-medium text-base
            bg-gradient-to-r from-[#5A7F5A] to-[#6B946B]
            hover:from-[#4E6F4E] hover:to-[#5A7F5A]
            active:scale-[0.98] transition-all shadow-sm"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
