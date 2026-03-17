'use client';

import { useState, useRef } from 'react';
import { useFlowState } from '../flow-state';

const SUGGESTED_INTERESTS = [
  'Fitness',
  'Meditation',
  'Career Growth',
  'Relationships',
  'Finance',
  'Creative Arts',
  'Travel',
  'Cooking',
  'Reading',
  'Music',
  'Parenting',
  'Entrepreneurship',
];

export default function AboutStep() {
  const { setProfession, setInterests, setPostcode, nextStep, profession, interests, postcode } = useFlowState();

  const [professionInput, setProfessionInput] = useState(profession ?? '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(interests ?? []);
  const [postcodeInput, setPostcodeInput] = useState(postcode ?? '');
  const [customInterest, setCustomInterest] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const canContinue = professionInput.trim().length > 0;

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest],
    );
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) {
      setSelectedInterests((prev) => [...prev, trimmed]);
    }
    setCustomInterest('');
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addCustomInterest();
    }
  };

  const handleSubmit = () => {
    if (!canContinue) return;
    setProfession(professionInput.trim());
    setInterests(selectedInterests);
    if (postcodeInput.trim()) {
      setPostcode(postcodeInput.trim());
    }
    nextStep();
  };

  return (
    <div className="flex flex-col gap-8 max-w-md mx-auto w-full px-6 pt-8 pb-12">
      <div className="text-center">
        <h2 className="font-['Instrument_Serif'] text-3xl md:text-4xl text-[#1A1816] tracking-tight">
          Tell us about yourself
        </h2>
        <p className="mt-3 text-[#7D756A] text-base">
          This helps us tailor your experience.
        </p>
      </div>

      {/* Profession */}
      <div className="flex flex-col gap-2">
        <label htmlFor="profession" className="text-sm font-medium text-[#1A1816]">
          What do you do? <span className="text-[#5A7F5A]">*</span>
        </label>
        <input
          id="profession"
          type="text"
          value={professionInput}
          onChange={(e) => setProfessionInput(e.target.value)}
          placeholder="e.g. Software Engineer, Teacher, Entrepreneur"
          className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] bg-white
            text-[#1A1816] placeholder:text-[#C4BFB6]
            focus:outline-none focus:ring-2 focus:ring-[#5A7F5A]/30 focus:border-[#5A7F5A]
            transition-colors"
        />
      </div>

      {/* Interests */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-[#1A1816]">Interests</label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_INTERESTS.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#5A7F5A] text-white'
                    : 'bg-[#F5F3EF] text-[#7D756A] border border-[#E8E4DD] hover:border-[#5A7F5A]/40'
                }`}
              >
                {interest}
              </button>
            );
          })}
          {/* Show custom interests that are not in the suggested list */}
          {selectedInterests
            .filter((i) => !SUGGESTED_INTERESTS.includes(i))
            .map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#5A7F5A] text-white transition-colors"
              >
                {interest}
              </button>
            ))}
        </div>
        {/* Custom interest input */}
        <div className="flex gap-2">
          <input
            ref={customInputRef}
            type="text"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            placeholder="Add your own..."
            className="flex-1 px-3 py-2 rounded-lg border border-[#E8E4DD] bg-white
              text-sm text-[#1A1816] placeholder:text-[#C4BFB6]
              focus:outline-none focus:ring-2 focus:ring-[#5A7F5A]/30 focus:border-[#5A7F5A]
              transition-colors"
          />
          <button
            type="button"
            onClick={addCustomInterest}
            disabled={!customInterest.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium text-[#5A7F5A]
              border border-[#5A7F5A]/30 hover:bg-[#5A7F5A]/10
              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Postcode */}
      <div className="flex flex-col gap-2">
        <label htmlFor="postcode" className="text-sm font-medium text-[#1A1816]">
          Postcode <span className="text-[#A8A198] text-xs font-normal">(optional)</span>
        </label>
        <input
          id="postcode"
          type="text"
          value={postcodeInput}
          onChange={(e) => setPostcodeInput(e.target.value)}
          placeholder="For weather-aware suggestions"
          className="w-full px-4 py-3 rounded-xl border border-[#E8E4DD] bg-white
            text-[#1A1816] placeholder:text-[#C4BFB6]
            focus:outline-none focus:ring-2 focus:ring-[#5A7F5A]/30 focus:border-[#5A7F5A]
            transition-colors"
        />
      </div>

      {/* Submit */}
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
