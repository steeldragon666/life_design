'use client';

import { useState } from 'react';
import { ALL_DIMENSIONS, DIMENSION_LABELS } from '@life-design/core';

interface Mentor {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface ProfileInput {
  profession: string;
  interests: string[];
  hobbies: string[];
  skills: string[];
  projects: string[];
  postcode: string;
}

interface OnboardingClientProps {
  mentors: Mentor[];
  onComplete: () => void;
  onActivateMentor: (mentorId: string) => void;
  onSaveProfile?: (data: ProfileInput) => void;
}

function OnboardingTagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      const v = inputValue.trim();
      if (!values.includes(v)) onChange([...values, v]);
      setInputValue('');
    }
    if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="text-left space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border p-2">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm text-indigo-800">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-indigo-500 hover:text-indigo-700">&times;</button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] border-none outline-none text-sm"
        />
      </div>
    </div>
  );
}

const STEPS = ['welcome', 'about-you', 'skills-projects', 'dimensions', 'mentors', 'finish'] as const;

export default function OnboardingClient({
  mentors,
  onComplete,
  onActivateMentor,
  onSaveProfile,
}: OnboardingClientProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [profileData, setProfileData] = useState<ProfileInput>({
    profession: '',
    interests: [],
    hobbies: [],
    skills: [],
    projects: [],
    postcode: '',
  });

  function handleNext() {
    if (step === 'skills-projects' && onSaveProfile) {
      onSaveProfile(profileData);
    }
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

      {step === 'about-you' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">About You</h2>
          <p className="text-gray-600">
            Tell us a bit about yourself so your AI mentors can give tailored advice.
          </p>
          <div className="space-y-3 text-left">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">What do you do for work?</label>
              <input
                type="text"
                value={profileData.profession}
                onChange={(e) => setProfileData({ ...profileData, profession: e.target.value })}
                placeholder="e.g. Commodities Trader, Retail Manager, Teacher"
                className="w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Your postcode (for weather-aware suggestions)</label>
              <input
                type="text"
                value={profileData.postcode}
                onChange={(e) => setProfileData({ ...profileData, postcode: e.target.value })}
                placeholder="e.g. SW1A 1AA, 10001"
                className="w-full rounded-lg border p-2 text-sm"
              />
            </div>
            <OnboardingTagInput
              label="What are you interested in?"
              values={profileData.interests}
              onChange={(v) => setProfileData({ ...profileData, interests: v })}
              placeholder="e.g. AI, cooking, travel..."
            />
            <OnboardingTagInput
              label="What are your hobbies?"
              values={profileData.hobbies}
              onChange={(v) => setProfileData({ ...profileData, hobbies: v })}
              placeholder="e.g. guitar, hiking, photography..."
            />
          </div>
          <button
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      )}

      {step === 'skills-projects' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Your Skills & Projects</h2>
          <p className="text-gray-600">
            These help us connect your goals to what you already know and are working on.
          </p>
          <div className="space-y-3">
            <OnboardingTagInput
              label="What skills do you have?"
              values={profileData.skills}
              onChange={(v) => setProfileData({ ...profileData, skills: v })}
              placeholder="e.g. TypeScript, public speaking, data analysis..."
            />
            <OnboardingTagInput
              label="Any active projects?"
              values={profileData.projects}
              onChange={(v) => setProfileData({ ...profileData, projects: v })}
              placeholder="e.g. Side business, Renovation, Open source..."
            />
          </div>
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
