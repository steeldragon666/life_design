'use client';

import { useState, useRef, useEffect } from 'react';
import { useFlowState } from '../flow-state';

export default function NameStep() {
  const { setUserName, nextStep, userName } = useFlowState();
  const [name, setName] = useState(userName ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canContinue = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canContinue) return;
    setUserName(name.trim());
    nextStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto w-full px-6 pt-8">
      <div className="text-center">
        <h2 className="font-['Instrument_Serif'] text-3xl md:text-4xl text-[#1A1816] tracking-tight">
          What should we call you?
        </h2>
        <p className="mt-3 text-[#7D756A] text-base">
          This helps your mentor personalise your experience.
        </p>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your first name"
        className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] bg-white
          text-[#1A1816] text-lg placeholder:text-[#C4BFB6]
          focus:outline-none focus:ring-2 focus:ring-[#5A7F5A]/30 focus:border-[#5A7F5A]
          transition-colors"
      />

      <button
        onClick={handleSubmit}
        disabled={!canContinue}
        className="w-full px-8 py-3.5 rounded-xl text-white font-medium text-base
          bg-gradient-to-r from-[#5A7F5A] to-[#6B946B]
          hover:from-[#4E6F4E] hover:to-[#5A7F5A]
          active:scale-[0.98] transition-all shadow-sm
          disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        Continue
      </button>
    </div>
  );
}
