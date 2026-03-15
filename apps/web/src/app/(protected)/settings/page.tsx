'use client';

import { useState, useEffect } from 'react';
import { useGuest } from '@/lib/guest-context';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E8E4DD]/60 overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <h3 className="text-xs text-[#A8A198] uppercase tracking-wider font-medium">{title}</h3>
      </div>
      <div className="px-5 pb-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-[#2A2623]">{label}</p>
        <p className="text-xs text-[#A8A198] mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-[#5A7F5A]' : 'bg-[#D4CFC5]'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ActionRow({ label, description, action, destructive, onClick }: {
  label: string; description: string; action: string; destructive?: boolean; onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-[#2A2623]">{label}</p>
        <p className="text-xs text-[#A8A198] mt-0.5">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          destructive
            ? 'bg-red-50 text-red-500 hover:bg-red-100'
            : 'bg-[#F5F3EF] text-[#5C554C] hover:bg-[#E8E4DD]'
        }`}
      >
        {action}
      </button>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#F5F3EF]" />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { profile, clearGuestData } = useGuest();

  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [storageUsed, setStorageUsed] = useState('—');

  // Estimate local storage usage
  useEffect(() => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          total += (localStorage.getItem(key) ?? '').length;
        }
      }
      const kb = total / 1024;
      setStorageUsed(kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`);
    } catch {
      setStorageUsed('—');
    }
  }, []);

  const displayName = profile?.name ?? 'Guest';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-['Instrument_Serif'] text-3xl lg:text-4xl text-[#1A1816]">Settings</h1>
        <p className="text-sm text-[#A8A198] mt-1">Personalize your Life Design experience</p>
      </div>

      {/* Profile */}
      <div className="p-6 rounded-2xl bg-white border border-[#E8E4DD]/60 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C4D5C4] to-[#9BB89B] flex items-center justify-center text-white text-xl font-['Instrument_Serif']">
            {initial}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-medium text-[#2A2623]">{displayName}</h2>
            <p className="text-sm text-[#A8A198]">Guest mode</p>
          </div>
          <button className="px-4 py-2 rounded-xl border border-[#E8E4DD] text-sm font-medium text-[#7D756A] hover:bg-[#F5F3EF] transition-colors">
            Edit
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-6">
        <SectionCard title="Notifications">
          <ToggleRow
            label="Push Notifications"
            description="Get notified about insights and reminders"
            value={notifications}
            onChange={setNotifications}
          />
          <Divider />
          <ToggleRow
            label="Daily Check-in Reminder"
            description="Gentle nudge at your preferred time"
            value={dailyReminder}
            onChange={setDailyReminder}
          />
        </SectionCard>

        <SectionCard title="Experience">
          <ToggleRow
            label="Voice Interactions"
            description="Enable voice commands and check-ins"
            value={voiceEnabled}
            onChange={setVoiceEnabled}
          />
          <Divider />
          <ToggleRow
            label="Dark Mode"
            description="Easier on the eyes at night"
            value={darkMode}
            onChange={setDarkMode}
          />
          <Divider />
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-[#2A2623]">Check-in Time</p>
              <p className="text-xs text-[#A8A198] mt-0.5">When to receive your daily prompt</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-[#F5F3EF] text-sm font-['DM_Mono'] text-[#5C554C] hover:bg-[#E8E4DD] transition-colors">
              8:00 AM
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Data & Privacy">
          <ActionRow label="Export My Data" description="Download all your check-ins and goals" action="Export" />
          <Divider />
          <ActionRow
            label="Clear Local Data"
            description="Remove all data stored on this device"
            action="Clear"
            destructive
            onClick={clearGuestData}
          />
        </SectionCard>

        <SectionCard title="About">
          <div className="flex items-center justify-between py-1">
            <p className="text-sm text-[#7D756A]">Version</p>
            <p className="text-sm font-['DM_Mono'] text-[#A8A198]">2.1.0</p>
          </div>
          <Divider />
          <div className="flex items-center justify-between py-1">
            <p className="text-sm text-[#7D756A]">Storage Used</p>
            <p className="text-sm font-['DM_Mono'] text-[#A8A198]">{storageUsed}</p>
          </div>
        </SectionCard>
      </div>

      <div className="mt-8 mb-4 text-center">
        <p className="text-xs text-[#C4C0B8]">Life Design &mdash; Crafted with care for meaningful living</p>
      </div>
    </div>
  );
}
