import { describe, expect, it } from 'vitest';
import {
  LEGACY_ONBOARDING_CHECKPOINT_KEY,
  LEGACY_ONBOARDING_PROGRESS_KEY,
  ONBOARDING_SESSION_STORAGE_KEY,
  buildOnboardingSession,
  migrateLegacyOnboardingSession,
  parseOnboardingSession,
} from '@/lib/onboarding-session';

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
});
