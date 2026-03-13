import { describe, expect, it } from 'vitest';
import {
  createOnboardingSessionPatchQueue,
  dismissOnboardingSessionNotice,
  getLatestOnboardingSessionNotice,
  LEGACY_ONBOARDING_CHECKPOINT_KEY,
  LEGACY_ONBOARDING_PROGRESS_KEY,
  ONBOARDING_SESSION_REPAIR_LOG_KEY,
  ONBOARDING_SESSION_STORAGE_KEY,
  buildOnboardingSession,
  loadOnboardingSessionFromStorage,
  migrateLegacyOnboardingSession,
  patchOnboardingSessionInStorage,
  parseOnboardingSession,
} from '@/lib/onboarding-session';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe('onboarding-session', () => {
  it('exports stable storage keys', () => {
    expect(ONBOARDING_SESSION_STORAGE_KEY).toBe('life-design-onboarding-session');
    expect(LEGACY_ONBOARDING_PROGRESS_KEY).toBe('life-design-onboarding-progress');
    expect(LEGACY_ONBOARDING_CHECKPOINT_KEY).toBe('life-design-onboarding-checkpoint');
  });

  it('builds and parses a normalized session payload', () => {
    const payload = buildOnboardingSession({
      flow: {
        currentStep: 'voice',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'therapist',
        selectedVoice: 'calm-british-female',
      },
      messages: [{ role: 'assistant', content: 'Welcome back' }],
      extractedProfile: { name: 'Aaron' },
    });

    const parsed = parseOnboardingSession(JSON.stringify(payload));
    expect(parsed?.flow.currentStep).toBe('voice');
    expect(parsed?.messages).toHaveLength(1);
    expect(parsed?.extractedProfile.name).toBe('Aaron');
    expect(typeof parsed?.checksum).toBe('string');
    expect(typeof parsed?.updatedAt).toBe('number');
  });

  it('migrates legacy progress + checkpoint into unified session', () => {
    const session = migrateLegacyOnboardingSession(
      JSON.stringify({
        currentStep: 'conversation',
        isVideoComplete: true,
        selectedTheme: 'botanical',
        selectedArchetype: 'sage',
        selectedVoice: 'soft-australian-female',
      }),
      JSON.stringify({
        messages: [{ role: 'user', content: 'My name is Aaron' }],
        extractedProfile: { name: 'Aaron', location: 'Sydney' },
      }),
    );

    expect(session?.flow.currentStep).toBe('conversation');
    expect(session?.flow.selectedTheme).toBe('botanical');
    expect(session?.messages[0]?.content).toContain('Aaron');
    expect(session?.extractedProfile.location).toBe('Sydney');
  });

  it('auto-upgrades old payload shape without checksum metadata', () => {
    const legacySession = JSON.stringify({
      v: 2,
      flow: {
        currentStep: 'voice',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'soft-female',
      },
      messages: [{ role: 'assistant', content: 'hello' }],
      extractedProfile: { name: 'Aaron' },
    });
    const storage = createMemoryStorage({
      [ONBOARDING_SESSION_STORAGE_KEY]: legacySession,
    });

    const loaded = loadOnboardingSessionFromStorage(storage);
    expect(loaded.flow.currentStep).toBe('voice');
    expect(loaded.checksum.length).toBeGreaterThan(0);

    const repairLogRaw = storage.getItem(ONBOARDING_SESSION_REPAIR_LOG_KEY);
    expect(repairLogRaw).toContain('upgraded_legacy_payload');
  });

  it('resets corrupted checksum payload and records repair event', () => {
    const valid = buildOnboardingSession({
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'botanical',
        selectedArchetype: 'therapist',
        selectedVoice: 'calm',
      },
      messages: [{ role: 'assistant', content: 'safe session' }],
      extractedProfile: { name: 'Aaron' },
    });
    const tampered = JSON.stringify({
      ...valid,
      extractedProfile: { name: 'Tampered' },
    });
    const storage = createMemoryStorage({
      [ONBOARDING_SESSION_STORAGE_KEY]: tampered,
    });

    const loaded = loadOnboardingSessionFromStorage(storage);
    expect(loaded.flow.currentStep).toBe('video');
    expect(loaded.messages).toHaveLength(0);
    expect(loaded.extractedProfile.name).toBeUndefined();

    const repairLogRaw = storage.getItem(ONBOARDING_SESSION_REPAIR_LOG_KEY);
    expect(repairLogRaw).toContain('checksum_mismatch');
  });

  it('treats stale session as expired and starts clean', () => {
    const stale = buildOnboardingSession({
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'sage',
        selectedVoice: 'slow-voice',
      },
      messages: [{ role: 'user', content: 'resume me' }],
      extractedProfile: { name: 'Aaron' },
      updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    });
    const storage = createMemoryStorage({
      [ONBOARDING_SESSION_STORAGE_KEY]: JSON.stringify(stale),
    });

    const loaded = loadOnboardingSessionFromStorage(storage);
    expect(loaded.flow.currentStep).toBe('video');
    expect(loaded.messages).toHaveLength(0);

    const repairLogRaw = storage.getItem(ONBOARDING_SESSION_REPAIR_LOG_KEY);
    expect(repairLogRaw).toContain('stale_session');
  });

  it('rebases patch write when newer cross-tab session is detected', () => {
    const older = buildOnboardingSession({
      flow: {
        currentStep: 'voice',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'old-theme',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: [{ role: 'assistant', content: 'older tab' }],
      extractedProfile: { name: 'Aaron' },
      updatedAt: Date.now() - 20,
    });
    const newer = buildOnboardingSession({
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'new-theme',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: [{ role: 'assistant', content: 'newer tab message' }],
      extractedProfile: { name: 'Aaron' },
      updatedAt: Date.now() - 10,
    });

    const map = new Map<string, string>([[ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(older)]]);
    let reads = 0;
    const storage: Storage = {
      get length() {
        return map.size;
      },
      clear() {
        map.clear();
      },
      getItem(key: string) {
        if (key === ONBOARDING_SESSION_STORAGE_KEY) {
          reads += 1;
          if (reads === 1) return map.get(key) ?? null;
          map.set(key, JSON.stringify(newer));
          return map.get(key) ?? null;
        }
        return map.has(key) ? map.get(key)! : null;
      },
      key(index: number) {
        return Array.from(map.keys())[index] ?? null;
      },
      removeItem(key: string) {
        map.delete(key);
      },
      setItem(key: string, value: string) {
        map.set(key, value);
      },
    };

    const patched = patchOnboardingSessionInStorage(storage, {
      flow: {
        ...newer.flow,
        selectedTheme: 'patched-theme',
      },
    });

    expect(patched.messages[0]?.content).toBe('newer tab message');
    expect(patched.flow.selectedTheme).toBe('patched-theme');
    expect(patched.updatedAt).toBeGreaterThan(newer.updatedAt);

    const repairLogRaw = storage.getItem(ONBOARDING_SESSION_REPAIR_LOG_KEY);
    expect(repairLogRaw).toContain('write_conflict_rebased');
  });

  it('skips no-op patch writes to avoid churn', () => {
    const existing = buildOnboardingSession({
      flow: {
        currentStep: 'voice',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: [{ role: 'assistant', content: 'steady' }],
      extractedProfile: { name: 'Aaron' },
    });

    const map = new Map<string, string>([[ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(existing)]]);
    let writes = 0;
    const storage: Storage = {
      get length() {
        return map.size;
      },
      clear() {
        map.clear();
      },
      getItem(key: string) {
        return map.has(key) ? map.get(key)! : null;
      },
      key(index: number) {
        return Array.from(map.keys())[index] ?? null;
      },
      removeItem(key: string) {
        map.delete(key);
      },
      setItem(key: string, value: string) {
        if (key === ONBOARDING_SESSION_STORAGE_KEY) writes += 1;
        map.set(key, value);
      },
    };

    const result = patchOnboardingSessionInStorage(storage, {
      flow: existing.flow,
      messages: existing.messages,
      extractedProfile: existing.extractedProfile,
    });

    expect(result.checksum).toBe(existing.checksum);
    expect(result.updatedAt).toBe(existing.updatedAt);
    expect(writes).toBe(0);
  });

  it('coalesces rapid patches and flushes once', () => {
    const storage = createMemoryStorage();
    const queue = createOnboardingSessionPatchQueue(storage, 1000);
    queue.schedule({
      flow: {
        currentStep: 'voice',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
    });
    queue.schedule({
      extractedProfile: { name: 'Aaron' },
    });

    const flushed = queue.flush();
    expect(flushed.flow.currentStep).toBe('voice');
    expect(flushed.extractedProfile.name).toBe('Aaron');
    queue.dispose();
  });

  it('truncates oversized message content in session payload', () => {
    const oversized = 'a'.repeat(12000);
    const session = buildOnboardingSession({
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: [{ role: 'assistant', content: oversized }],
      extractedProfile: { name: 'Aaron' },
    });

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].content.length).toBeLessThan(oversized.length);
  });

  it('trims oldest messages when session payload exceeds size budget', () => {
    const largeMessages = Array.from({ length: 200 }, (_, index) => ({
      role: 'assistant' as const,
      content: `message-${index}-${'x'.repeat(1500)}`,
    }));
    const session = buildOnboardingSession({
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: largeMessages,
      extractedProfile: { name: 'Aaron' },
    });

    expect(session.messages.length).toBeLessThan(largeMessages.length);
    expect(session.messages.at(-1)?.content.startsWith('message-199-')).toBe(true);
  });

  it('records payload trimming and exposes a notice message', () => {
    const storage = createMemoryStorage();
    const largeMessages = Array.from({ length: 220 }, (_, index) => ({
      role: 'assistant' as const,
      content: `long-${index}-${'x'.repeat(1600)}`,
    }));

    patchOnboardingSessionInStorage(storage, {
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: largeMessages,
      extractedProfile: { name: 'Aaron' },
    });

    const repairLogRaw = storage.getItem(ONBOARDING_SESSION_REPAIR_LOG_KEY);
    expect(repairLogRaw).toContain('payload_trimmed');
    expect(getLatestOnboardingSessionNotice(storage)).toMatch(/recent context/i);
  });

  it('hides notice when dismissed for current session storage', () => {
    const repairStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    patchOnboardingSessionInStorage(repairStorage, {
      flow: {
        currentStep: 'conversation',
        isVideoComplete: true,
        hasSkippedVideo: false,
        selectedTheme: 'ocean',
        selectedArchetype: 'coach',
        selectedVoice: 'voice-a',
      },
      messages: Array.from({ length: 220 }, (_, index) => ({
        role: 'assistant' as const,
        content: `long-${index}-${'x'.repeat(1600)}`,
      })),
      extractedProfile: { name: 'Aaron' },
    });

    expect(getLatestOnboardingSessionNotice(repairStorage, sessionStorage)).toMatch(/recent context/i);
    dismissOnboardingSessionNotice(sessionStorage);
    expect(getLatestOnboardingSessionNotice(repairStorage, sessionStorage)).toBeNull();
  });
});
