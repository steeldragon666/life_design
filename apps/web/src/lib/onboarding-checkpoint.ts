import type { ExtractedGoal, ExtractedProfile } from '@/lib/onboarding-extraction';

export interface OnboardingConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ONBOARDING_CHECKPOINT_STORAGE_KEY = 'life-design-onboarding-checkpoint';

interface OnboardingCheckpointPayload {
  v: number;
  messages: OnboardingConversationMessage[];
  extractedProfile: ExtractedProfile;
}

function sanitizeMessages(value: unknown): OnboardingConversationMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is OnboardingConversationMessage =>
        typeof item === 'object' &&
        item !== null &&
        ((item as { role?: unknown }).role === 'user' || (item as { role?: unknown }).role === 'assistant') &&
        typeof (item as { content?: unknown }).content === 'string',
    )
    .slice(0, 200);
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const next = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 24);
  return next.length ? next : undefined;
}

function sanitizeProfile(value: unknown): ExtractedProfile {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const goals = Array.isArray(source.goals)
    ? source.goals
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
          const goal = item as Record<string, unknown>;
          const title = typeof goal.title === 'string' ? goal.title.trim() : '';
          if (!title) return null;
          const horizon: ExtractedGoal['horizon'] =
            goal.horizon === 'short' || goal.horizon === 'medium' || goal.horizon === 'long'
              ? goal.horizon
              : 'medium';
          return {
            title,
            horizon,
            description: typeof goal.description === 'string' ? goal.description.trim() : undefined,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 20)
    : undefined;

  return {
    name: typeof source.name === 'string' ? source.name.trim() : undefined,
    location: typeof source.location === 'string' ? source.location.trim() : undefined,
    profession: typeof source.profession === 'string' ? source.profession.trim() : undefined,
    interests: sanitizeStringArray(source.interests),
    hobbies: sanitizeStringArray(source.hobbies),
    maritalStatus: typeof source.maritalStatus === 'string' ? source.maritalStatus.trim() : undefined,
    goals: goals?.length ? goals : undefined,
  };
}

export function parseOnboardingCheckpoint(raw: string): OnboardingCheckpointPayload | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      v: 1,
      messages: sanitizeMessages(parsed.messages),
      extractedProfile: sanitizeProfile(parsed.extractedProfile),
    };
  } catch {
    return null;
  }
}

export function buildOnboardingCheckpoint(input: {
  messages: OnboardingConversationMessage[];
  extractedProfile: ExtractedProfile;
}): OnboardingCheckpointPayload {
  return {
    v: 1,
    messages: sanitizeMessages(input.messages),
    extractedProfile: sanitizeProfile(input.extractedProfile),
  };
}
