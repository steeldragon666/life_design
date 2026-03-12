'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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
  setProfile: (profile: GuestProfile) => void;
  addGoal: (goal: GuestGoals) => void;
  addCheckin: (checkin: GuestCheckins) => void;
  addIntegration: (integration: Omit<GuestIntegration, 'id' | 'connected_at'>) => void;
  removeIntegration: (provider: string) => void;
  setVoicePreference: (voiceId: string) => void;
  clearGuestData: () => void;
  isGuest: boolean;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<GuestProfile | null>(null);
  const [goals, setGoals] = useState<GuestGoals[]>([]);
  const [checkins, setCheckins] = useState<GuestCheckins[]>([]);
  const [integrations, setIntegrations] = useState<GuestIntegration[]>([]);
  const [voicePreference, setVoicePreferenceState] = useState<string>('calm-british-female');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('life-design-guest-profile');
      const savedGoals = localStorage.getItem('life-design-guest-goals');
      const savedCheckins = localStorage.getItem('life-design-guest-checkins');
      const savedIntegrations = localStorage.getItem('life-design-guest-integrations');
      const savedVoice = localStorage.getItem('life-design-voice-preference');

      if (savedProfile) setProfileState(JSON.parse(savedProfile));
      if (savedGoals) setGoals(JSON.parse(savedGoals));
      if (savedCheckins) setCheckins(JSON.parse(savedCheckins));
      if (savedIntegrations) setIntegrations(JSON.parse(savedIntegrations));
      if (savedVoice) setVoicePreferenceState(savedVoice);
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
    } catch (error) {
      console.error('Failed to save guest data to localStorage:', error);
    }
  }, [profile, goals, checkins, integrations, voicePreference, isHydrated]);

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
  };

  const clearGuestData = () => {
    localStorage.removeItem('life-design-guest-profile');
    localStorage.removeItem('life-design-guest-goals');
    localStorage.removeItem('life-design-guest-checkins');
    localStorage.removeItem('life-design-guest-integrations');
    setProfileState(null);
    setGoals([]);
    setCheckins([]);
    setIntegrations([]);
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
          setProfile: () => {},
          addGoal: () => {},
          addCheckin: () => {},
          addIntegration: () => {},
          removeIntegration: () => {},
          setVoicePreference: () => {},
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
        setProfile,
        addGoal,
        addCheckin,
        addIntegration,
        removeIntegration,
        setVoicePreference,
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
