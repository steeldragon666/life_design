import type { ExtractedProfile } from '@/lib/onboarding-extraction';
import { buildOnboardingCheckpoint, parseOnboardingCheckpoint } from '@/lib/onboarding-checkpoint';
import type { OnboardingStep } from '@/components/onboarding/flow-state';

export const ONBOARDING_SESSION_STORAGE_KEY = 'life-design-onboarding-session';
export const LEGACY_ONBOARDING_PROGRESS_KEY = 'life-design-onboarding-progress';
export const LEGACY_ONBOARDING_CHECKPOINT_KEY = 'life-design-onboarding-checkpoint';
export const ONBOARDING_SESSION_REPAIR_LOG_KEY = 'life-design-onboarding-session-repair-log';

const STEP_ORDER: OnboardingStep[] = ['video', 'theme', 'archetype', 'voice', 'conversation', 'complete'];
const ONBOARDING_SESSION_VERSION = 3;
const ONBOARDING_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const MAX_REPAIR_EVENTS = 20;
const MAX_SESSION_PAYLOAD_BYTES = 200_000;
const MAX_MESSAGE_CONTENT_CHARS = 4_000;
const MAX_PROFILE_STRING_CHARS = 256;
const MAX_PROFILE_LIST_ITEM_CHARS = 80;
const MAX_GOAL_TITLE_CHARS = 160;
const MAX_GOAL_DESCRIPTION_CHARS = 500;

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
  updatedAt: number;
  checksum: string;
  flow: OnboardingFlowSnapshot;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  extractedProfile: ExtractedProfile;
}

interface BuildOnboardingSessionInput {
  flow?: unknown;
  messages?: unknown;
  extractedProfile?: unknown;
  updatedAt?: unknown;
}

export interface OnboardingSessionPatchQueue {
  schedule: (patch: Partial<OnboardingSessionPayload>) => void;
  flush: () => OnboardingSessionPayload;
  dispose: () => void;
}

type SessionRepairReason =
  | 'invalid_json'
  | 'invalid_shape'
  | 'checksum_mismatch'
  | 'stale_session'
  | 'upgraded_legacy_payload'
  | 'migrated_legacy_keys'
  | 'write_conflict_rebased';

interface SessionRepairEvent {
  reason: SessionRepairReason;
  at: number;
}

interface ParseResult {
  session: OnboardingSessionPayload | null;
  reason?: SessionRepairReason;
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

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildChecksumCore(input: {
  flow: OnboardingFlowSnapshot;
  messages: OnboardingSessionPayload['messages'];
  extractedProfile: ExtractedProfile;
}): string {
  return hashText(
    stableStringify({
      flow: input.flow,
      messages: input.messages,
      extractedProfile: input.extractedProfile,
    }),
  );
}

function clampText(value: string, maxChars: number): string {
  return value.length > maxChars ? value.slice(0, maxChars) : value;
}

function normalizeMessagesForStorage(
  messages: OnboardingSessionPayload['messages'],
): OnboardingSessionPayload['messages'] {
  return messages.map((message) => ({
    role: message.role,
    content: clampText(message.content, MAX_MESSAGE_CONTENT_CHARS),
  }));
}

function normalizeProfileForStorage(profile: ExtractedProfile): ExtractedProfile {
  return {
    ...profile,
    name: typeof profile.name === 'string' ? clampText(profile.name, MAX_PROFILE_STRING_CHARS) : profile.name,
    location:
      typeof profile.location === 'string'
        ? clampText(profile.location, MAX_PROFILE_STRING_CHARS)
        : profile.location,
    profession:
      typeof profile.profession === 'string'
        ? clampText(profile.profession, MAX_PROFILE_STRING_CHARS)
        : profile.profession,
    maritalStatus:
      typeof profile.maritalStatus === 'string'
        ? clampText(profile.maritalStatus, MAX_PROFILE_STRING_CHARS)
        : profile.maritalStatus,
    interests: profile.interests?.map((item) => clampText(item, MAX_PROFILE_LIST_ITEM_CHARS)),
    hobbies: profile.hobbies?.map((item) => clampText(item, MAX_PROFILE_LIST_ITEM_CHARS)),
    goals: profile.goals?.map((goal) => ({
      ...goal,
      title: clampText(goal.title, MAX_GOAL_TITLE_CHARS),
      description: typeof goal.description === 'string'
        ? clampText(goal.description, MAX_GOAL_DESCRIPTION_CHARS)
        : goal.description,
    })),
  };
}

function estimateSessionPayloadBytes(input: {
  flow: OnboardingFlowSnapshot;
  messages: OnboardingSessionPayload['messages'];
  extractedProfile: ExtractedProfile;
}): number {
  try {
    const payload = stableStringify({
      v: ONBOARDING_SESSION_VERSION,
      updatedAt: Date.now(),
      checksum: '',
      flow: input.flow,
      messages: input.messages,
      extractedProfile: input.extractedProfile,
    });
    return new TextEncoder().encode(payload).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

function trimMessagesToPayloadBudget(input: {
  flow: OnboardingFlowSnapshot;
  messages: OnboardingSessionPayload['messages'];
  extractedProfile: ExtractedProfile;
}): OnboardingSessionPayload['messages'] {
  const next = [...input.messages];
  while (
    next.length > 0 &&
    estimateSessionPayloadBytes({
      flow: input.flow,
      messages: next,
      extractedProfile: input.extractedProfile,
    }) > MAX_SESSION_PAYLOAD_BYTES
  ) {
    next.shift();
  }
  return next;
}

function nextMonotonicTimestamp(previousUpdatedAt: number): number {
  return Math.max(Date.now(), previousUpdatedAt + 1);
}

export function buildOnboardingSession(input: BuildOnboardingSessionInput): OnboardingSessionPayload {
  const baseCheckpoint = buildOnboardingCheckpoint({
    messages: Array.isArray(input.messages) ? input.messages : [],
    extractedProfile:
      input.extractedProfile && typeof input.extractedProfile === 'object'
        ? (input.extractedProfile as ExtractedProfile)
        : {},
  });
  const flow = sanitizeFlow(input.flow ?? EMPTY_FLOW);
  const extractedProfile = normalizeProfileForStorage(baseCheckpoint.extractedProfile);
  const normalizedMessages = normalizeMessagesForStorage(baseCheckpoint.messages);
  const messages = trimMessagesToPayloadBudget({
    flow,
    messages: normalizedMessages,
    extractedProfile,
  });
  const updatedAt = typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt)
    ? input.updatedAt
    : Date.now();
  const checksum = buildChecksumCore({
    flow,
    messages,
    extractedProfile,
  });
  return {
    v: ONBOARDING_SESSION_VERSION,
    updatedAt,
    checksum,
    flow,
    messages,
    extractedProfile,
  };
}

export function parseOnboardingSession(raw: string): OnboardingSessionPayload | null {
  return parseOnboardingSessionInternal(raw).session;
}

function parseOnboardingSessionInternal(raw: string): ParseResult {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return { session: null, reason: 'invalid_shape' };

    const flow = sanitizeFlow(parsed.flow);
    const normalized = buildOnboardingSession({
      flow,
      messages: parsed.messages as OnboardingSessionPayload['messages'],
      extractedProfile: parsed.extractedProfile as ExtractedProfile,
      updatedAt: parsed.updatedAt,
    });
    const providedChecksum = typeof parsed.checksum === 'string' ? parsed.checksum : null;
    const isMetadataPresent = typeof parsed.updatedAt === 'number' && typeof parsed.checksum === 'string';
    const ageMs = Date.now() - normalized.updatedAt;
    if (ageMs > ONBOARDING_SESSION_MAX_AGE_MS) {
      return { session: null, reason: 'stale_session' };
    }
    if (providedChecksum && providedChecksum !== normalized.checksum) {
      return { session: null, reason: 'checksum_mismatch' };
    }
    if (!isMetadataPresent) {
      return { session: normalized, reason: 'upgraded_legacy_payload' };
    }
    return { session: normalized };
  } catch {
    return { session: null, reason: 'invalid_json' };
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

function readRepairEvents(storage: Storage): SessionRepairEvent[] {
  const raw = readStorageSafe(storage, ONBOARDING_SESSION_REPAIR_LOG_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SessionRepairEvent =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as { reason?: unknown }).reason === 'string' &&
          typeof (item as { at?: unknown }).at === 'number',
      )
      .slice(-MAX_REPAIR_EVENTS);
  } catch {
    return [];
  }
}

function recordSessionRepairEvent(storage: Storage, reason: SessionRepairReason): void {
  try {
    const events = readRepairEvents(storage);
    const next: SessionRepairEvent[] = [...events, { reason, at: Date.now() }].slice(-MAX_REPAIR_EVENTS);
    storage.setItem(ONBOARDING_SESSION_REPAIR_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ignore telemetry failures.
  }
}

export function loadOnboardingSessionFromStorage(storage: Storage): OnboardingSessionPayload {
  const raw = readStorageSafe(storage, ONBOARDING_SESSION_STORAGE_KEY);
  const parsed = raw ? parseOnboardingSessionInternal(raw) : { session: null as OnboardingSessionPayload | null };
  if (parsed.session) {
    if (parsed.reason === 'upgraded_legacy_payload') {
      recordSessionRepairEvent(storage, parsed.reason);
      try {
        storage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(parsed.session));
      } catch {
        // Ignore write failures.
      }
    }
    return parsed.session;
  }
  if (parsed.reason) {
    recordSessionRepairEvent(storage, parsed.reason);
  }

  const migrated = migrateLegacyOnboardingSession(
    readStorageSafe(storage, LEGACY_ONBOARDING_PROGRESS_KEY),
    readStorageSafe(storage, LEGACY_ONBOARDING_CHECKPOINT_KEY),
  );

  if (migrated) {
    recordSessionRepairEvent(storage, 'migrated_legacy_keys');
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
  let base = current;

  // Re-read immediately before write to reduce cross-tab clobbering risk.
  const latestRaw = readStorageSafe(storage, ONBOARDING_SESSION_STORAGE_KEY);
  const latest = latestRaw ? parseOnboardingSessionInternal(latestRaw) : { session: null as OnboardingSessionPayload | null };
  if (latest.session && latest.session.updatedAt > current.updatedAt) {
    base = latest.session;
    recordSessionRepairEvent(storage, 'write_conflict_rebased');
  }

  const mergedFlow = patch.flow ?? base.flow;
  const mergedMessages = patch.messages ?? base.messages;
  const mergedExtractedProfile = patch.extractedProfile ?? base.extractedProfile;

  const normalizedWithoutBump = buildOnboardingSession({
    flow: mergedFlow,
    messages: mergedMessages,
    extractedProfile: mergedExtractedProfile,
    updatedAt: base.updatedAt,
  });
  if (normalizedWithoutBump.checksum === base.checksum) {
    return base;
  }

  const next = buildOnboardingSession({
    flow: mergedFlow,
    messages: mergedMessages,
    extractedProfile: mergedExtractedProfile,
    updatedAt: nextMonotonicTimestamp(base.updatedAt),
  });
  try {
    storage.setItem(ONBOARDING_SESSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore persistence failures.
  }
  return next;
}

function mergeSessionPatches(
  current: Partial<OnboardingSessionPayload>,
  incoming: Partial<OnboardingSessionPayload>,
): Partial<OnboardingSessionPayload> {
  return {
    flow: incoming.flow ?? current.flow,
    messages: incoming.messages ?? current.messages,
    extractedProfile: incoming.extractedProfile ?? current.extractedProfile,
  };
}

export function createOnboardingSessionPatchQueue(
  storage: Storage,
  debounceMs = 180,
): OnboardingSessionPatchQueue {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Partial<OnboardingSessionPayload> = {};

  const flush = () => {
    const patch = pending;
    pending = {};
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    return patchOnboardingSessionInStorage(storage, patch);
  };

  return {
    schedule(patch) {
      pending = mergeSessionPatches(pending, patch);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        flush();
      }, debounceMs);
    },
    flush,
    dispose() {
      pending = {};
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

export function clearOnboardingSessionInStorage(storage: Storage): void {
  try {
    storage.removeItem(ONBOARDING_SESSION_STORAGE_KEY);
    storage.removeItem(LEGACY_ONBOARDING_PROGRESS_KEY);
    storage.removeItem(LEGACY_ONBOARDING_CHECKPOINT_KEY);
    storage.removeItem(ONBOARDING_SESSION_REPAIR_LOG_KEY);
  } catch {
    // Ignore storage failures.
  }
}
