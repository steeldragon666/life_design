'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MentorArchetype } from './mentor-archetypes';
import { decryptLocalStorageString, encryptLocalStorageString } from './local-storage-crypto';
import {
  appendConversationExchangeSummary,
  appendConversationKeyFact,
  type ConversationMemoryEntry,
} from './conversation-memory';

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
  // Profiling scores stored after onboarding completion
  [key: string]: unknown;
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

export type MicroMomentsCadence = 'light' | 'balanced' | 'focused';

export interface MicroMomentsPreferences {
  enabled: boolean;
  cadence: MicroMomentsCadence;
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
  metadata?: Record<string, unknown>;
}

interface GuestContextType {
  profile: GuestProfile | null;
  goals: GuestGoals[];
  checkins: GuestCheckins[];
  conversationMemory: ConversationMemoryEntry[];
  integrations: GuestIntegration[];
  voicePreference: string;
  mentorProfile: MentorProfile;
  soundscape: SoundscapePreferences;
  microMoments: MicroMomentsPreferences;
  setProfile: (profile: GuestProfile) => void;
  addGoal: (goal: GuestGoals) => void;
  addCheckin: (checkin: GuestCheckins) => void;
  appendConversationKeyFact: (fact: string, source?: string) => void;
  appendConversationSummary: (summary: string, source?: string) => void;
  addIntegration: (integration: Omit<GuestIntegration, 'id' | 'connected_at'>) => void;
  removeIntegration: (provider: string) => void;
  setVoicePreference: (voiceId: string) => void;
  setMentorProfile: (profile: Partial<MentorProfile>) => void;
  setSoundscape: (prefs: Partial<SoundscapePreferences>) => void;
  setMicroMoments: (prefs: Partial<MicroMomentsPreferences>) => void;
  clearGuestData: () => void;
  isGuest: boolean;
  isHydrated: boolean;
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

const DEFAULT_MICRO_MOMENTS: MicroMomentsPreferences = {
  enabled: true,
  cadence: 'balanced',
};

const GUEST_PROFILE_STORAGE_KEY = 'opt-in-guest-profile';
const GUEST_GOALS_STORAGE_KEY = 'opt-in-guest-goals';
const GUEST_CHECKINS_STORAGE_KEY = 'opt-in-guest-checkins';
const CONVERSATION_MEMORY_STORAGE_KEY = 'opt-in-conversation-memory';
const MENTOR_PROFILE_STORAGE_KEY = 'opt-in-mentor-profile';
const SOUNDSCAPE_STORAGE_KEY = 'opt-in-soundscape-preferences';
const MICRO_MOMENTS_STORAGE_KEY = 'opt-in-micro-moments-preferences';
const GUEST_INTEGRATIONS_STORAGE_KEY = 'opt-in-guest-integrations';

// One-time migration: copy old "life-design-*" localStorage keys to "opt-in-*" keys.
// Runs on first load after brand rename. Old keys are removed after successful copy.
const LEGACY_KEY_MAP: [string, string][] = [
  ['life-design-guest-profile', GUEST_PROFILE_STORAGE_KEY],
  ['life-design-guest-goals', GUEST_GOALS_STORAGE_KEY],
  ['life-design-guest-checkins', GUEST_CHECKINS_STORAGE_KEY],
  ['life-design-conversation-memory', CONVERSATION_MEMORY_STORAGE_KEY],
  ['life-design-mentor-profile', MENTOR_PROFILE_STORAGE_KEY],
  ['life-design-soundscape-preferences', SOUNDSCAPE_STORAGE_KEY],
  ['life-design-micro-moments-preferences', MICRO_MOMENTS_STORAGE_KEY],
  ['life-design-guest-integrations', GUEST_INTEGRATIONS_STORAGE_KEY],
  ['life-design-onboarding-session', 'opt-in-onboarding-session'],
  ['life-design-onboarding-card', 'opt-in-onboarding-card'],
];

function migrateLocalStorageKeys() {
  if (typeof window === 'undefined') return;
  // Only run once — check if migration already happened
  if (localStorage.getItem('opt-in-ls-migrated')) return;
  for (const [oldKey, newKey] of LEGACY_KEY_MAP) {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
    }
  }
  localStorage.setItem('opt-in-ls-migrated', '1');
}
const GUEST_INTEGRATIONS_CRYPTO_SCOPE = 'guest-integrations';
const GUEST_ONBOARDED_COOKIE = 'opt-in-guest-onboarded';

function parseIntegrations(rawValue: string): GuestIntegration[] {
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse guest integrations payload.', error);
    return [];
  }
}

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<GuestProfile | null>(null);
  const [goals, setGoals] = useState<GuestGoals[]>([]);
  const [checkins, setCheckins] = useState<GuestCheckins[]>([]);
  const [conversationMemory, setConversationMemory] = useState<ConversationMemoryEntry[]>([]);
  const [integrations, setIntegrations] = useState<GuestIntegration[]>([]);
  const [mentorProfile, setMentorProfileState] = useState<MentorProfile>(DEFAULT_MENTOR_PROFILE);
  const [soundscape, setSoundscapeState] = useState<SoundscapePreferences>(DEFAULT_SOUNDSCAPE);
  const [microMoments, setMicroMomentsState] = useState<MicroMomentsPreferences>(DEFAULT_MICRO_MOMENTS);
  const [isHydrated, setIsHydrated] = useState(false);
  const voicePreference = profile?.voicePreference ?? mentorProfile.voiceId ?? DEFAULT_MENTOR_PROFILE.voiceId;

  // Load from localStorage on mount
  useEffect(() => {
    let isCancelled = false;

    const hydrateGuestData = async () => {
      // Migrate old "life-design-*" keys to "opt-in-*" before reading
      migrateLocalStorageKeys();

      try {
        const savedProfile = localStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
        const savedGoals = localStorage.getItem(GUEST_GOALS_STORAGE_KEY);
        const savedCheckins = localStorage.getItem(GUEST_CHECKINS_STORAGE_KEY);
        const savedConversationMemory = localStorage.getItem(CONVERSATION_MEMORY_STORAGE_KEY);
        const savedIntegrations = localStorage.getItem(GUEST_INTEGRATIONS_STORAGE_KEY);
        const savedMentor = localStorage.getItem(MENTOR_PROFILE_STORAGE_KEY);
        const savedSoundscape = localStorage.getItem(SOUNDSCAPE_STORAGE_KEY);
        const savedMicroMoments = localStorage.getItem(MICRO_MOMENTS_STORAGE_KEY);

        const parsedProfile: GuestProfile | null = savedProfile ? JSON.parse(savedProfile) : null;
        if (parsedProfile) {
          setProfileState(parsedProfile);
        }
        if (savedGoals) setGoals(JSON.parse(savedGoals));
        if (savedCheckins) setCheckins(JSON.parse(savedCheckins));
        if (savedConversationMemory) setConversationMemory(JSON.parse(savedConversationMemory));
        if (savedMentor) setMentorProfileState({ ...DEFAULT_MENTOR_PROFILE, ...JSON.parse(savedMentor) });
        if (savedSoundscape) setSoundscapeState({ ...DEFAULT_SOUNDSCAPE, ...JSON.parse(savedSoundscape) });
        if (savedMicroMoments) {
          setMicroMomentsState({ ...DEFAULT_MICRO_MOMENTS, ...JSON.parse(savedMicroMoments) });
        }

        if (savedIntegrations) {
          const result = await decryptLocalStorageString(savedIntegrations, GUEST_INTEGRATIONS_CRYPTO_SCOPE);
          if (isCancelled) return;

          if (result.plaintext) {
            const parsedIntegrations = parseIntegrations(result.plaintext);
            setIntegrations(parsedIntegrations);

            if (result.shouldMigrate) {
              try {
                const migrated = await encryptLocalStorageString(result.plaintext, GUEST_INTEGRATIONS_CRYPTO_SCOPE);
                if (!isCancelled) {
                  localStorage.setItem(GUEST_INTEGRATIONS_STORAGE_KEY, migrated);
                }
              } catch (migrationError) {
                console.warn('Failed to migrate guest integrations to encrypted storage.', migrationError);
              }
            }
          } else if (result.wasEncrypted) {
            console.warn('Guest integrations are encrypted but could not be decrypted on this device/browser.');
            setIntegrations([]);
          }
        }

        // Backward compatibility: migrate legacy standalone voice preference into profile.
        const legacyVoicePreference = localStorage.getItem('opt-in-voice-preference') || localStorage.getItem('life-design-voice-preference');
        if (legacyVoicePreference && !parsedProfile?.voicePreference) {
          setProfileState((prev) =>
            prev
              ? { ...prev, voicePreference: legacyVoicePreference }
              : { id: 'guest-user', voicePreference: legacyVoicePreference }
          );
          localStorage.removeItem('opt-in-voice-preference');
          localStorage.removeItem('life-design-voice-preference');
        }
      } catch (error) {
        console.error('Failed to load guest data from localStorage:', error);
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    };

    void hydrateGuestData();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!isHydrated) return;
    
    let isCancelled = false;

    const saveGuestData = async () => {
      try {
        if (profile) {
          localStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(profile));
        }
        localStorage.setItem(GUEST_GOALS_STORAGE_KEY, JSON.stringify(goals));
        localStorage.setItem(GUEST_CHECKINS_STORAGE_KEY, JSON.stringify(checkins));
        localStorage.setItem(CONVERSATION_MEMORY_STORAGE_KEY, JSON.stringify(conversationMemory));
        localStorage.setItem(MENTOR_PROFILE_STORAGE_KEY, JSON.stringify(mentorProfile));
        localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, JSON.stringify(soundscape));
        localStorage.setItem(MICRO_MOMENTS_STORAGE_KEY, JSON.stringify(microMoments));
      } catch (error) {
        console.error('Failed to save guest data to localStorage:', error);
      }

      try {
        const serializedIntegrations = JSON.stringify(integrations);
        const storedIntegrations = await encryptLocalStorageString(
          serializedIntegrations,
          GUEST_INTEGRATIONS_CRYPTO_SCOPE
        );

        if (!isCancelled) {
          localStorage.setItem(GUEST_INTEGRATIONS_STORAGE_KEY, storedIntegrations);
        }
      } catch (error) {
        console.error('Failed to save encrypted guest integrations to localStorage:', error);
        // Do NOT fall back to plaintext — tokens would be exposed to XSS
      }
    };

    void saveGuestData();
    return () => {
      isCancelled = true;
    };
  }, [
    profile,
    goals,
    checkins,
    conversationMemory,
    integrations,
    mentorProfile,
    soundscape,
    microMoments,
    isHydrated,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    // Only UPGRADE the cookie to '1' when profile confirms onboarded.
    // Never downgrade to '0' — the cookie was set by handleComplete()
    // synchronously and must not be overwritten during hydration when
    // the profile hasn't loaded from localStorage yet. Clearing the
    // cookie is handled explicitly by clearGuestData().
    if (profile?.onboarded) {
      document.cookie = `${GUEST_ONBOARDED_COOKIE}=1; Path=/; Max-Age=2592000; SameSite=Lax`;
    }
  }, [profile?.onboarded, isHydrated]);

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

  const appendConversationFact = (fact: string, source?: string) => {
    setConversationMemory((prev) => appendConversationKeyFact(prev, fact, source));
  };

  const appendConversationSummary = (summary: string, source?: string) => {
    setConversationMemory((prev) => appendConversationExchangeSummary(prev, summary, source));
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
    // Single source of truth: store in profile.
    setProfileState((prev) => (prev ? { ...prev, voicePreference: voiceId } : { id: 'guest-user', voicePreference: voiceId }));
    setMentorProfileState((prev) => ({ ...prev, voiceId }));
  };

  const setMentorProfile = (next: Partial<MentorProfile>) => {
    setMentorProfileState((prev) => ({ ...prev, ...next }));
  };

  const setSoundscape = (next: Partial<SoundscapePreferences>) => {
    setSoundscapeState((prev) => ({ ...prev, ...next }));
  };

  const setMicroMoments = (next: Partial<MicroMomentsPreferences>) => {
    setMicroMomentsState((prev) => ({ ...prev, ...next }));
  };

  const clearGuestData = () => {
    localStorage.removeItem(GUEST_PROFILE_STORAGE_KEY);
    localStorage.removeItem(GUEST_GOALS_STORAGE_KEY);
    localStorage.removeItem(GUEST_CHECKINS_STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_MEMORY_STORAGE_KEY);
    localStorage.removeItem('opt-in-voice-preference');
    localStorage.removeItem('life-design-voice-preference');
    localStorage.removeItem(GUEST_INTEGRATIONS_STORAGE_KEY);
    localStorage.removeItem(MENTOR_PROFILE_STORAGE_KEY);
    localStorage.removeItem(SOUNDSCAPE_STORAGE_KEY);
    localStorage.removeItem(MICRO_MOMENTS_STORAGE_KEY);
    document.cookie = `${GUEST_ONBOARDED_COOKIE}=0; Path=/; Max-Age=0; SameSite=Lax`;
    setProfileState(null);
    setGoals([]);
    setCheckins([]);
    setConversationMemory([]);
    setIntegrations([]);
    setMentorProfileState(DEFAULT_MENTOR_PROFILE);
    setSoundscapeState(DEFAULT_SOUNDSCAPE);
    setMicroMomentsState(DEFAULT_MICRO_MOMENTS);
  };

  if (!isHydrated) {
    // Provide context during hydration to prevent layout shift
    return (
      <GuestContext.Provider
        value={{
          profile: null,
          goals: [],
          checkins: [],
          conversationMemory: [],
          integrations: [],
          voicePreference: 'calm-british-female',
          mentorProfile: DEFAULT_MENTOR_PROFILE,
          soundscape: DEFAULT_SOUNDSCAPE,
          microMoments: DEFAULT_MICRO_MOMENTS,
          setProfile: () => {},
          addGoal: () => {},
          addCheckin: () => {},
          appendConversationKeyFact: () => {},
          appendConversationSummary: () => {},
          addIntegration: () => {},
          removeIntegration: () => {},
          setVoicePreference: () => {},
          setMentorProfile: () => {},
          setSoundscape: () => {},
          setMicroMoments: () => {},
          clearGuestData: () => {},
          isGuest: true,
          isHydrated: false,
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
        conversationMemory,
        integrations,
        voicePreference,
        mentorProfile,
        soundscape,
        microMoments,
        setProfile,
        addGoal,
        addCheckin,
        appendConversationKeyFact: appendConversationFact,
        appendConversationSummary,
        addIntegration,
        removeIntegration,
        setVoicePreference,
        setMentorProfile,
        setSoundscape,
        setMicroMoments,
        clearGuestData,
        isGuest: true,
        isHydrated: true,
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
