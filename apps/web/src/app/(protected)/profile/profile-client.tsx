'use client';

import { useState, useCallback } from 'react';
import type { ProfileData } from '@/lib/services/profile-service';

interface ProfileClientProps {
  initialProfile: ProfileData;
  onSave: (data: Partial<ProfileData>) => Promise<{ error?: string | null }>;
}

function TagInput({
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
      const newValue = inputValue.trim();
      if (!values.includes(newValue)) {
        onChange([...values, newValue]);
      }
      setInputValue('');
    }
    if (e.key === 'Backspace' && !inputValue && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function removeTag(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1.5 rounded-lg border p-2 focus-within:ring-2 focus-within:ring-indigo-500">
        {values.map((value, i) => (
          <span
            key={`${value}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-sm text-indigo-800"
          >
            {value}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-indigo-500 hover:text-indigo-700"
            >
              &times;
            </button>
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
      <p className="text-xs text-gray-400">Press Enter or comma to add</p>
    </div>
  );
}

export default function ProfileClient({ initialProfile, onSave }: ProfileClientProps) {
  const [profile, setProfile] = useState<ProfileData>({
    profession: initialProfile.profession ?? '',
    interests: initialProfile.interests ?? [],
    projects: initialProfile.projects ?? [],
    hobbies: initialProfile.hobbies ?? [],
    skills: initialProfile.skills ?? [],
    postcode: initialProfile.postcode ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await onSave({
      profession: profile.profession || null,
      interests: profile.interests,
      projects: profile.projects,
      hobbies: profile.hobbies,
      skills: profile.skills,
      postcode: profile.postcode || null,
    });
    setSaving(false);
    if (result.error) {
      setMessage(`Error: ${result.error}`);
    } else {
      setMessage('Profile saved successfully');
    }
  }, [profile, onSave]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <p className="text-gray-600">
        This information helps your AI mentors give more relevant, personalized advice.
      </p>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Profession</label>
          <input
            type="text"
            value={profile.profession ?? ''}
            onChange={(e) => setProfile({ ...profile, profession: e.target.value })}
            placeholder="e.g. Commodities Trader, Retail Manager, Software Engineer"
            className="w-full rounded-lg border p-2 text-sm"
            maxLength={200}
          />
          <p className="text-xs text-gray-400">
            Your mentor will track industry events relevant to your profession
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Postcode</label>
          <input
            type="text"
            value={profile.postcode ?? ''}
            onChange={(e) => setProfile({ ...profile, postcode: e.target.value })}
            placeholder="e.g. SW1A 1AA, 10001"
            className="w-full rounded-lg border p-2 text-sm"
          />
          <p className="text-xs text-gray-400">
            Used for weather-aware suggestions (e.g. rainy day alternatives for outdoor plans)
          </p>
        </div>

        <TagInput
          label="Interests"
          values={profile.interests}
          onChange={(v) => setProfile({ ...profile, interests: v })}
          placeholder="e.g. AI, cooking, travel..."
        />

        <TagInput
          label="Hobbies"
          values={profile.hobbies}
          onChange={(v) => setProfile({ ...profile, hobbies: v })}
          placeholder="e.g. guitar, hiking, photography..."
        />

        <TagInput
          label="Skills"
          values={profile.skills}
          onChange={(v) => setProfile({ ...profile, skills: v })}
          placeholder="e.g. TypeScript, public speaking, data analysis..."
        />

        <TagInput
          label="Projects"
          values={profile.projects}
          onChange={(v) => setProfile({ ...profile, projects: v })}
          placeholder="e.g. Side business, Renovation, Open source..."
        />
      </div>

      {message && (
        <p className={`text-sm ${message.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  );
}
