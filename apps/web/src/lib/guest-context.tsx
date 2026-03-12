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
    const savedProfile = localStorage.getItem('life_design_guest_profile');
    const savedGoals = localStorage.getItem('life_design_guest_goals');
    const savedCheckins = localStorage.getItem('life_design_guest_checkins');
    const savedIntegrations = localStorage.getItem('life_design_guest_integrations');
    const savedVoice = localStorage.getItem('life_design_voice_preference');

    if (savedProfile) setProfileState(JSON.parse(savedProfile));
    if (savedGoals) setGoals(JSON.parse(savedGoals));
    if (savedCheckins) setCheckins(JSON.parse(savedCheckins));
    if (savedIntegrations) setIntegrations(JSON.parse(savedIntegrations));
    if (savedVoice) setVoicePreferenceState(savedVoice);
    
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!isHydrated) return;
    
    if (profile) {
      localStorage.setItem('life_design_guest_profile', JSON.stringify(profile));
    }
    localStorage.setItem('life_design_guest_goals', JSON.stringify(goals));
    localStorage.setItem('life_design_guest_checkins', JSON.stringify(checkins));
    localStorage.setItem('life_design_guest_integrations', JSON.stringify(integrations));
    localStorage.setItem('life_design_voice_preference', voicePreference);
  }, [profile, goals, checkins, integrations, voicePreference, isHydrated]);

  const setProfile = (newProfile: GuestProfile) => {
    setProfileState({ ...profile, ...newProfile, id: 'guest-user' });
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
    localStorage.removeItem('life_design_guest_profile');
    localStorage.removeItem('life_design_guest_goals');
    localStorage.removeItem('life_design_guest_checkins');
    localStorage.removeItem('life_design_guest_integrations');
    setProfileState(null);
    setGoals([]);
    setCheckins([]);
    setIntegrations([]);
  };

  if (!isHydrated) {
    return null; // or a loading spinner
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
