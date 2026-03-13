import { describe, expect, it } from 'vitest';
import {
  buildOnboardingCheckpoint,
  parseOnboardingCheckpoint,
  ONBOARDING_CHECKPOINT_STORAGE_KEY,
} from '@/lib/onboarding-checkpoint';

describe('onboarding-checkpoint', () => {
  it('exports stable storage key', () => {
    expect(ONBOARDING_CHECKPOINT_STORAGE_KEY).toBe('life-design-onboarding-checkpoint');
  });

  it('parses valid payload and sanitizes malformed fields', () => {
    const parsed = parseOnboardingCheckpoint(
      JSON.stringify({
        v: 1,
        messages: [{ role: 'assistant', content: 'Hello' }, { role: 'bad', content: 123 }],
        extractedProfile: { name: 'Aaron', interests: ['focus', '', 12] },
      }),
    );

    expect(parsed?.messages).toHaveLength(1);
    expect(parsed?.messages[0].role).toBe('assistant');
    expect(parsed?.extractedProfile.name).toBe('Aaron');
    expect(parsed?.extractedProfile.interests).toEqual(['focus']);
  });

  it('returns null for invalid JSON', () => {
    expect(parseOnboardingCheckpoint('{invalid')).toBeNull();
  });

  it('builds normalized checkpoint payload', () => {
    const payload = buildOnboardingCheckpoint({
      messages: [{ role: 'user', content: 'My name is Aaron' }],
      extractedProfile: { name: 'Aaron', goals: [{ title: 'Run marathon', horizon: 'medium' }] },
    });

    expect(payload.v).toBe(1);
    expect(payload.messages).toHaveLength(1);
    expect(payload.extractedProfile.name).toBe('Aaron');
    expect(payload.extractedProfile.goals?.[0]?.title).toBe('Run marathon');
  });
});
