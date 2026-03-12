'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MentorArchetype } from './mentor-archetypes';

interface GuestProfile {
  id: string;
  name?: string;
  profession?: string;
  postcode?: string;
  interests?: string[];
  hobbies?: string[];
  skills?: string[];
  projects?: string[];
  maritalStatus?: string;
  onboarded?: boolean;
  voicePreference?: string;
}

export interface MentorProfile {
  archetype: MentorArchetype;
  characterName: string;
  voiceId: string;
  style: {
    opening: string;
    affirmation: string;
    promptStyle: string;
  };
}

export interface SoundscapePreferences {
  enabled: boolean;
  volume: number;
  humEnabled: boolean;
  humFrequency: number;
}

interface GuestGoals {
  id: string;
  title: string;
  horizon: 'short' | 'medium' | 'long';
  description?: string;
  status: 'active' | 'completed' | 'paused';
  target_date: string;
}

interface GuestCheckins {
  id: string;
  date: string;
  mood: number;
  duration_type: 'quick' | 'deep';
  journal_entry?: string;
  dimension_scores: Array<{ dimension: string; score: number }>;
}

interface GuestIntegration {
  id: string;
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  connected_at: string;
  metadata?: any;
}

interface GuestContextType {
  profile: GuestProfile | null;
  goals: GuestGoals[];
  checkins: GuestCheckins[];
  integrations: GuestIntegration[];
  voicePreference: string;
  mentorProfile: MentorProfile;
  soundscape: SoundscapePreferences;
  setProfile: (profile: GuestProfile) => void;
  addGoal: (goal: GuestGoals) => void;
  addCheckin: (checkin: GuestCheckins) => void;
  addIntegration: (integration: Omit<GuestIntegration, 'id' | 'connected_at'>) => void;
  removeIntegration: (provider: string) => void;
  setVoicePreference: (voiceId: string) => void;
  setMentorProfile: (profile: Partial<MentorProfile>) => void;
  setSoundscape: (prefs: Partial<SoundscapePreferences>) => void;
  clearGuestData: () => void;
  isGuest: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

const DEFAULT_MENTOR_PROFILE: MentorProfile = {
  archetype: 'therapist',
  characterName: 'Eleanor',
  voiceId: 'calm-british-female',
  style: {
    opening: 'Take a gentle breath. We can go at your pace.',
    affirmation: 'You are safe here, and your experience matters.',
    promptStyle: 'Reflective, emotionally validating, and non-judgmental.',
  },
};

const DEFAULT_SOUNDSCAPE: SoundscapePreferences = {
  enabled: true,
  volume: 0.18,
  humEnabled: true,
  humFrequency: 100,
};

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<GuestProfile | null>(null);
  const [goals, setGoals] = useState<GuestGoals[]>([]);
  const [checkins, setCheckins] = useState<GuestCheckins[]>([]);
  const [integrations, setIntegrations] = useState<GuestIntegration[]>([]);
  const [voicePreference, setVoicePreferenceState] = useState<string>('calm-british-female');
  const [mentorProfile, setMentorProfileState] = useState<MentorProfile>(DEFAULT_MENTOR_PROFILE);
  const [soundscape, setSoundscapeState] = useState<SoundscapePreferences>(DEFAULT_SOUNDSCAPE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('life-design-guest-profile');
      const savedGoals = localStorage.getItem('life-design-guest-goals');
      const savedCheckins = localStorage.getItem('life-design-guest-checkins');
      const savedIntegrations = localStorage.getItem('life-design-guest-integrations');
      const savedVoice = localStorage.getItem('life-design-voice-preference');
      const savedMentor = localStorage.getItem('life-design-mentor-profile');
      const savedSoundscape = localStorage.getItem('life-design-soundscape-preferences');

      if (savedProfile) setProfileState(JSON.parse(savedProfile));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedCheckins) setCheckins(JSON.parse(savedCheckins));
      if (savedIntegrations) setIntegrations(JSON.parse(savedIntegrations));
      if (savedVoice) setVoicePreferenceState(savedVoice);
      if (savedMentor) setMentorProfileState({ ...DEFAULT_MENTOR_PROFILE, ...JSON.parse(savedMentor) });
      if (savedSoundscape) setSoundscapeState({ ...DEFAULT_SOUNDSCAPE, ...JSON.parse(savedSoundscape) });
    } catch (error) {
      console.error('Failed to load guest data from localStorage:', error);
    }
    
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!isHydrated) return;
    
    try {
      if (profile) {
        localStorage.setItem('life-design-guest-profile', JSON.stringify(profile));
      }
      localStorage.setItem('life-design-guest-goals', JSON.stringify(goals));
      localStorage.setItem('life-design-guest-checkins', JSON.stringify(checkins));
      localStorage.setItem('life-design-guest-integrations', JSON.stringify(integrations));
      localStorage.setItem('life-design-voice-preference', voicePreference);
      localStorage.setItem('life-design-mentor-profile', JSON.stringify(mentorProfile));
      localStorage.setItem('life-design-soundscape-preferences', JSON.stringify(soundscape));
    } catch (error) {
      console.error('Failed to save guest data to localStorage:', error);
    }
  }, [profile, goals, checkins, integrations, voicePreference, mentorProfile, soundscape, isHydrated]);

  const setProfile = (newProfile: GuestProfile) => {
    if (profile) {
      // Update existing profile
      setProfileState({ ...profile, ...newProfile });
    } else {
      // Create new profile with guest-user ID if not provided
      const profileWithId = newProfile.id ? newProfile : { ...newProfile, id: 'guest-user' };
      setProfileState(profileWithId);
    }
  };

  const addGoal = (goal: GuestGoals) => {
    setGoals((prev) => [...prev, { ...goal, id: `goal-${Date.now()}` }]);
  };

  const addCheckin = (checkin: GuestCheckins) => {
    setCheckins((prev) => [...prev, { ...checkin, id: `checkin-${Date.now()}` }]);
  };

  const addIntegration = (integration: Omit<GuestIntegration, 'id' | 'connected_at'>) => {
    setIntegrations((prev) => {
      // Remove existing integration for same provider
      const filtered = prev.filter(i => i.provider !== integration.provider);
      return [...filtered, {
        ...integration,
        id: `integration-${Date.now()}`,
        connected_at: new Date().toISOString(),
      }];
    });
  };

  const removeIntegration = (provider: string) => {
    setIntegrations((prev) => prev.filter(i => i.provider !== provider));
  };

  const setVoicePreference = (voiceId: string) => {
    setVoicePreferenceState(voiceId);
    // Also update profile
    setProfileState((prev) => prev ? { ...prev, voicePreference: voiceId } : null);
    setMentorProfileState((prev) => ({ ...prev, voiceId }));
  };

  const setMentorProfile = (next: Partial<MentorProfile>) => {
    setMentorProfileState((prev) => ({ ...prev, ...next }));
  };

  const setSoundscape = (next: Partial<SoundscapePreferences>) => {
    setSoundscapeState((prev) => ({ ...prev, ...next }));
  };

  const clearGuestData = () => {
    localStorage.removeItem('life-design-guest-profile');
    localStorage.removeItem('life-design-guest-goals');
    localStorage.removeItem('life-design-guest-checkins');
    localStorage.removeItem('life-design-guest-integrations');
    localStorage.removeItem('life-design-mentor-profile');
    localStorage.removeItem('life-design-soundscape-preferences');
    setProfileState(null);
    setGoals([]);
    setCheckins([]);
    setIntegrations([]);
    setMentorProfileState(DEFAULT_MENTOR_PROFILE);
    setSoundscapeState(DEFAULT_SOUNDSCAPE);
  };

  if (!isHydrated) {
    // Provide context during hydration to prevent layout shift
    return (
      <GuestContext.Provider
        value={{
          profile: null,
          goals: [],
          checkins: [],
          integrations: [],
          voicePreference: 'calm-british-female',
          mentorProfile: DEFAULT_MENTOR_PROFILE,
          soundscape: DEFAULT_SOUNDSCAPE,
          setProfile: () => {},
          addGoal: () => {},
          addCheckin: () => {},
          addIntegration: () => {},
          removeIntegration: () => {},
          setVoicePreference: () => {},
          setMentorProfile: () => {},
          setSoundscape: () => {},
          clearGuestData: () => {},
          isGuest: true,
        }}
      >
        {children}
      </GuestContext.Provider>
    );
  }

  return (
    <GuestContext.Provider
      value={{
        profile,
        goals,
        checkins,
        integrations,
        voicePreference,
        mentorProfile,
        soundscape,
        setProfile,
        addGoal,
        addCheckin,
        addIntegration,
        removeIntegration,
        setVoicePreference,
        setMentorProfile,
        setSoundscape,
        clearGuestData,
        isGuest: true,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}
