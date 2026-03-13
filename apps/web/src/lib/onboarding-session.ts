import type { ExtractedProfile } from '@/lib/onboarding-extraction';
import { buildOnboardingCheckpoint, parseOnboardingCheckpoint } from '@/lib/onboarding-checkpoint';
import type { OnboardingStep } from '@/components/onboarding/flow-state';

export const ONBOARDING_SESSION_STORAGE_KEY = 'life-design-onboarding-session';
export const LEGACY_ONBOARDING_PROGRESS_KEY = 'life-design-onboarding-progress';
export const LEGACY_ONBOARDING_CHECKPOINT_KEY = 'life-design-onboarding-checkpoint';

const STEP_ORDER: OnboardingStep[] = ['video', 'theme', 'archetype', 'voice', 'conversation', 'complete'];

export interface OnboardingFlowSnapshot {
  currentStep: OnboardingStep;
  isVideoComplete: boolean;
  hasSkippedVideo: boolean;
  selectedTheme: string | null;
  selectedArchetype: string | null;
  selectedVoice: string | null;
}

export interface OnboardingSessionPayload {
  v: number;
  flow: OnboardingFlowSnapshot;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  extractedProfile: ExtractedProfile;
}

interface BuildOnboardingSessionInput {
  flow?: unknown;
  messages?: unknown;
  extractedProfile?: unknown;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function sanitizeFlow(value: unknown): OnboardingFlowSnapshot {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const selectedTheme = asStringOrNull(source.selectedTheme);
  const selectedArchetype = asStringOrNull(source.selectedArchetype);
  const selectedVoice = asStringOrNull(source.selectedVoice);
  const isVideoComplete = Boolean(source.isVideoComplete);
  const currentStepRaw = source.currentStep;
  let currentStep: OnboardingStep =
    typeof currentStepRaw === 'string' && STEP_ORDER.includes(currentStepRaw as OnboardingStep)
      ? (currentStepRaw as OnboardingStep)
      : 'video';

  if (!isVideoComplete && currentStep !== 'video') currentStep = 'video';
  else if (STEP_ORDER.indexOf(currentStep) >= STEP_ORDER.indexOf('archetype') && !selectedTheme) currentStep = 'theme';
  else if (STEP_ORDER.indexOf(currentStep) >= STEP_ORDER.indexOf('voice') && !selectedArchetype) currentStep = 'archetype';
  else if (STEP_ORDER.indexOf(currentStep) >= STEP_ORDER.indexOf('conversation') && !selectedVoice) currentStep = 'voice';

  return {
    currentStep,
    isVideoComplete,
    hasSkippedVideo: Boolean(source.hasSkippedVideo),
    selectedTheme,
    selectedArchetype,
    selectedVoice,
  };
}

const EMPTY_FLOW: OnboardingFlowSnapshot = {
  currentStep: 'video',
  isVideoComplete: false,
  hasSkippedVideo: false,
  selectedTheme: null,
  selectedArchetype: null,
  selectedVoice: null,
};

export function buildOnboardingSession(input: BuildOnboardingSessionInput): OnboardingSessionPayload {
  const baseCheckpoint = buildOnboardingCheckpoint({
    messages: Array.isArray(input.messages) ? input.messages : [],
    extractedProfile:
      input.extractedProfile && typeof input.extractedProfile === 'object'
        ? (input.extractedProfile as ExtractedProfile)
        : {},
  });
  return {
    v: 2,
    flow: sanitizeFlow(input.flow ?? EMPTY_FLOW),
    messages: baseCheckpoint.messages,
    extractedProfile: baseCheckpoint.extractedProfile,
  };
}

export function parseOnboardingSession(raw: string): OnboardingSessionPayload | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    return buildOnboardingSession({
      flow: sanitizeFlow(parsed.flow),
      messages: parsed.messages as OnboardingSessionPayload['messages'],
      extractedProfile: parsed.extractedProfile as ExtractedProfile,
    });
  } catch {
    return null;
  }
}

export function migrateLegacyOnboardingSession(
  legacyProgressRaw: string | null,
  legacyCheckpointRaw: string | null,
): OnboardingSessionPayload | null {
  if (!legacyProgressRaw && !legacyCheckpointRaw) return null;

  let flow = EMPTY_FLOW;
  if (legacyProgressRaw) {
    try {
      const parsed = JSON.parse(legacyProgressRaw) as Record<string, unknown>;
      flow = sanitizeFlow(parsed);
    } catch {
      // Ignore malformed legacy progress payload.
    }
  }

  let messages: OnboardingSessionPayload['messages'] = [];
  let extractedProfile: ExtractedProfile = {};
  if (legacyCheckpointRaw) {
    const parsedCheckpoint = parseOnboardingCheckpoint(legacyCheckpointRaw);
    if (parsedCheckpoint) {
      messages = parsedCheckpoint.messages;
      extractedProfile = parsedCheckpoint.extractedProfile;
    }
  }

  return buildOnboardingSession({ flow, messages, extractedProfile });
}

function readStorageSafe(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function loadOnboardingSessionFromStorage(storage: Storage): OnboardingSessionPayload {
  const raw = readStorageSafe(storage, ONBOARDING_SESSION_STORAGE_KEY);
  const parsed = raw ? parseOnboardingSession(raw) : null;
  if (parsed) return parsed;

  const migrated = migrateLegacyOnboardingSession(
    readStorageSafe(storage, LEGACY_ONBOARDING_PROGRESS_KEY),
    readStorageSafe(storage, LEGACY_ONBOARDING_CHECKPOINT_KEY),
  );

  if (migrated) {
    try {
      storage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(migrated));
      storage.removeItem(LEGACY_ONBOARDING_PROGRESS_KEY);
      storage.removeItem(LEGACY_ONBOARDING_CHECKPOINT_KEY);
    } catch {
      // Ignore storage write/remove errors.
    }
    return migrated;
  }

  return buildOnboardingSession({});
}

export function patchOnboardingSessionInStorage(
  storage: Storage,
  patch: Partial<OnboardingSessionPayload>,
): OnboardingSessionPayload {
  const current = loadOnboardingSessionFromStorage(storage);
  const next = buildOnboardingSession({
    flow: patch.flow ?? current.flow,
    messages: patch.messages ?? current.messages,
    extractedProfile: patch.extractedProfile ?? current.extractedProfile,
  });
  try {
    storage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore persistence failures.
  }
  return next;
}

export function clearOnboardingSessionInStorage(storage: Storage): void {
  try {
    storage.removeItem(ONBOARDING_SESSION_STORAGE_KEY);
    storage.removeItem(LEGACY_ONBOARDING_PROGRESS_KEY);
    storage.removeItem(LEGACY_ONBOARDING_CHECKPOINT_KEY);
  } catch {
    // Ignore storage failures.
  }
}
