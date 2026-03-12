import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  applyChatRateLimit,
  type ValidationError as ChatValidationError,
} from '@/lib/chat-security';
import { buildMentorSystemPrompt } from '@/lib/mentor-orchestrator';
import { inferMoodAdaptation } from '@/lib/mood-adapter';
import {
  buildFallbackWeeklyDigest,
  buildWeeklyDigestPrompt,
  buildWeeklyDigestSeed,
  parseDigestSectionsFromText,
  type WeeklyDigestCheckin,
  type WeeklyDigestGoal,
  type WeeklyDigestProfile,
} from '@/lib/weekly-digest';
import type { MentorProfile } from '@/lib/guest-context';
import type { ConversationMemoryEntry } from '@/lib/conversation-memory';

type WeeklyDigestValidationError = {
  status: 400;
  message: string;
};

type WeeklyDigestRequestPayload = {
  profile?: WeeklyDigestProfile | null;
  goals?: WeeklyDigestGoal[] | null;
  checkins?: WeeklyDigestCheckin[] | null;
  mentorProfile?: MentorProfile | null;
  conversationMemory?: ConversationMemoryEntry[] | null;
};

type ValidatedWeeklyDigestPayload = {
  profile: WeeklyDigestProfile;
  goals: WeeklyDigestGoal[];
  checkins: WeeklyDigestCheckin[];
  mentorProfile: MentorProfile;
  conversationMemory: ConversationMemoryEntry[];
};

const MAX_GOALS = 100;
const MAX_CHECKINS = 730;
const MAX_TEXT_FIELD_LENGTH = 4_000;
const MAX_PROFILE_NAME_LENGTH = 120;
const MAX_MEMORY_ITEMS = 40;

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

function normalizeInputText(value: string): string {
  return value.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

function normalizeModelOutputText(value: string): string {
  return value.normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function throwValidation(message: string): never {
  throw { status: 400, message } satisfies WeeklyDigestValidationError;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertString(value: unknown, fieldName: string, maxLength = MAX_TEXT_FIELD_LENGTH): string {
  if (typeof value !== 'string') {
    throwValidation(`${fieldName} must be a string`);
  }

  const normalized = normalizeInputText(value).trim();
  if (!normalized) {
    throwValidation(`${fieldName} is required`);
  }

  if (normalized.length > maxLength) {
    throwValidation(`${fieldName} exceeds max length of ${maxLength}`);
  }

  return normalized;
}

function sanitizeProfile(profile: unknown): WeeklyDigestProfile | undefined {
  if (profile == null) return undefined;
  if (!isObject(profile)) throwValidation('profile must be an object');

  const idValue = profile.id;
  if (typeof idValue !== 'string' || !idValue.trim()) {
    throwValidation('profile.id must be a non-empty string');
  }

  const result: WeeklyDigestProfile = {
    id: assertString(idValue, 'profile.id', 120),
  };

  if (profile.name !== undefined) {
    result.name = assertString(profile.name, 'profile.name', MAX_PROFILE_NAME_LENGTH);
  }
  if (profile.profession !== undefined) {
    result.profession = assertString(profile.profession, 'profile.profession', 160);
  }
  if (profile.interests !== undefined) {
    if (!Array.isArray(profile.interests)) {
      throwValidation('profile.interests must be an array');
    }
    result.interests = profile.interests
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeInputText(value).trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return result;
}

function sanitizeGoals(goals: unknown): WeeklyDigestGoal[] {
  if (goals == null) return [];
  if (!Array.isArray(goals)) {
    throwValidation('goals must be an array');
  }
  if (goals.length > MAX_GOALS) {
    throwValidation(`goals exceeds max items of ${MAX_GOALS}`);
  }

  return goals.map((goal, index) => {
    if (!isObject(goal)) throwValidation(`goals[${index}] must be an object`);

    const title = assertString(goal.title, `goals[${index}].title`, 240);
    const id = goal.id === undefined ? `goal-${index + 1}` : assertString(goal.id, `goals[${index}].id`, 120);
    const targetDate = assertString(goal.target_date, `goals[${index}].target_date`, 30);
    const horizon =
      goal.horizon === 'short' || goal.horizon === 'medium' || goal.horizon === 'long'
        ? goal.horizon
        : 'short';
    const status =
      goal.status === 'active' ||
      goal.status === 'completed' ||
      goal.status === 'paused' ||
      goal.status === 'abandoned'
        ? goal.status
        : 'active';
    const description =
      typeof goal.description === 'string'
        ? normalizeInputText(goal.description).trim().slice(0, MAX_TEXT_FIELD_LENGTH)
        : undefined;
    const goal_dimensions = Array.isArray(goal.goal_dimensions)
      ? goal.goal_dimensions
          .filter((item): item is { dimension: string } => isObject(item) && typeof item.dimension === 'string')
          .map((item) => ({ dimension: normalizeInputText(item.dimension).trim().toLowerCase() }))
          .filter((item) => Boolean(item.dimension))
          .slice(0, 3)
      : [];

    return {
      id,
      title,
      horizon,
      status,
      target_date: targetDate,
      description,
      goal_dimensions,
    } satisfies WeeklyDigestGoal;
  });
}

function sanitizeCheckins(checkins: unknown): WeeklyDigestCheckin[] {
  if (checkins == null) return [];
  if (!Array.isArray(checkins)) {
    throwValidation('checkins must be an array');
  }
  if (checkins.length > MAX_CHECKINS) {
    throwValidation(`checkins exceeds max items of ${MAX_CHECKINS}`);
  }

  return checkins.map((checkin, index) => {
    if (!isObject(checkin)) throwValidation(`checkins[${index}] must be an object`);

    const id = checkin.id === undefined ? `checkin-${index + 1}` : assertString(checkin.id, `checkins[${index}].id`, 120);
    const date = assertString(checkin.date, `checkins[${index}].date`, 30);
    const moodRaw = Number(checkin.mood);
    if (!Number.isFinite(moodRaw) || moodRaw < 1 || moodRaw > 10) {
      throwValidation(`checkins[${index}].mood must be a number between 1 and 10`);
    }
    const duration_type = checkin.duration_type === 'deep' ? 'deep' : 'quick';
    const journal_entry =
      typeof checkin.journal_entry === 'string'
        ? normalizeInputText(checkin.journal_entry).trim().slice(0, MAX_TEXT_FIELD_LENGTH)
        : undefined;

    if (!Array.isArray(checkin.dimension_scores)) {
      throwValidation(`checkins[${index}].dimension_scores must be an array`);
    }
    const dimension_scores = checkin.dimension_scores
      .filter((score): score is { dimension: string; score: number } => isObject(score) && typeof score.dimension === 'string')
      .map((score) => ({
        dimension: normalizeInputText(score.dimension).trim().toLowerCase(),
        score: Math.min(10, Math.max(1, Number(score.score))),
      }))
      .filter((score) => Boolean(score.dimension));

    return {
      id,
      date,
      mood: moodRaw,
      duration_type,
      journal_entry,
      dimension_scores,
    } satisfies WeeklyDigestCheckin;
  });
}

function sanitizeMentorProfile(mentorProfile: unknown): MentorProfile {
  if (!isObject(mentorProfile)) return DEFAULT_MENTOR_PROFILE;
  if (
    mentorProfile.archetype !== 'therapist' &&
    mentorProfile.archetype !== 'coach' &&
    mentorProfile.archetype !== 'sage'
  ) {
    return DEFAULT_MENTOR_PROFILE;
  }

  return {
    archetype: mentorProfile.archetype,
    characterName:
      typeof mentorProfile.characterName === 'string' && mentorProfile.characterName.trim()
        ? normalizeInputText(mentorProfile.characterName).trim().slice(0, 80)
        : DEFAULT_MENTOR_PROFILE.characterName,
    voiceId:
      typeof mentorProfile.voiceId === 'string' && mentorProfile.voiceId.trim()
        ? normalizeInputText(mentorProfile.voiceId).trim().slice(0, 120)
        : DEFAULT_MENTOR_PROFILE.voiceId,
    style: {
      opening:
        isObject(mentorProfile.style) && typeof mentorProfile.style.opening === 'string'
          ? normalizeInputText(mentorProfile.style.opening).trim().slice(0, 200)
          : DEFAULT_MENTOR_PROFILE.style.opening,
      affirmation:
        isObject(mentorProfile.style) && typeof mentorProfile.style.affirmation === 'string'
          ? normalizeInputText(mentorProfile.style.affirmation).trim().slice(0, 240)
          : DEFAULT_MENTOR_PROFILE.style.affirmation,
      promptStyle:
        isObject(mentorProfile.style) && typeof mentorProfile.style.promptStyle === 'string'
          ? normalizeInputText(mentorProfile.style.promptStyle).trim().slice(0, 240)
          : DEFAULT_MENTOR_PROFILE.style.promptStyle,
    },
  };
}

function sanitizeConversationMemory(memory: unknown): ConversationMemoryEntry[] {
  if (memory == null) return [];
  if (!Array.isArray(memory)) {
    throwValidation('conversationMemory must be an array');
  }
  if (memory.length > MAX_MEMORY_ITEMS) {
    throwValidation(`conversationMemory exceeds max items of ${MAX_MEMORY_ITEMS}`);
  }

  return memory
    .filter((entry): entry is ConversationMemoryEntry => isObject(entry) && typeof entry.content === 'string')
    .map((entry, index) => ({
      id:
        typeof entry.id === 'string' && entry.id.trim()
          ? normalizeInputText(entry.id).trim().slice(0, 120)
          : `memory-${index + 1}`,
      kind: entry.kind === 'key-fact' ? 'key-fact' : 'exchange-summary',
      content: normalizeInputText(entry.content).trim().slice(0, 320),
      source: typeof entry.source === 'string' ? normalizeInputText(entry.source).trim().slice(0, 60) : undefined,
      createdAt:
        typeof entry.createdAt === 'string' && entry.createdAt.trim()
          ? normalizeInputText(entry.createdAt).trim().slice(0, 40)
          : new Date().toISOString(),
    }));
}

function validatePayload(payload: unknown): ValidatedWeeklyDigestPayload {
  if (!isObject(payload)) {
    throwValidation('Request body must be a JSON object');
  }

  return {
    profile: sanitizeProfile(payload.profile) ?? { id: 'guest-user' },
    goals: sanitizeGoals(payload.goals),
    checkins: sanitizeCheckins(payload.checkins),
    mentorProfile: sanitizeMentorProfile(payload.mentorProfile),
    conversationMemory: sanitizeConversationMemory(payload.conversationMemory),
  };
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = applyChatRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many digest requests. Please retry shortly.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throwValidation('Request body must be valid JSON');
    }

    const { profile, goals, checkins, mentorProfile, conversationMemory } = validatePayload(payload);
    const seed = buildWeeklyDigestSeed({ profile, goals, checkins });
    const fallbackDigest = buildFallbackWeeklyDigest(seed);
    const systemPrompt = buildMentorSystemPrompt(mentorProfile, 'mentors', {
      mood: inferMoodAdaptation(checkins.map((checkin) => ({ mood: checkin.mood }))),
      memory: conversationMemory,
    });

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          digest: fallbackDigest,
          stats: seed.stats,
          insights: seed.insights,
          source: 'fallback',
          generatedAt: new Date().toISOString(),
          warning: 'AI key not configured; returned deterministic digest.',
        },
        {
          headers: {
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    const prompt = `${systemPrompt}\n\n${buildWeeklyDigestPrompt(seed, profile.name)}`;

    let digest = fallbackDigest;
    let source: 'ai' | 'fallback' = 'fallback';
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = normalizeModelOutputText(response.text());
      const parsed = parseDigestSectionsFromText(text);
      if (parsed) {
        digest = parsed;
        source = 'ai';
      }
    } catch (modelError) {
      console.warn('Weekly digest AI generation failed, falling back to deterministic digest.', modelError);
    }

    return NextResponse.json(
      {
        digest,
        stats: seed.stats,
        insights: seed.insights,
        source,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      ((error as ChatValidationError).status === 400 ||
        (error as WeeklyDigestValidationError).status === 400)
    ) {
      return NextResponse.json(
        {
          error: (error as WeeklyDigestValidationError).message,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    console.error('Weekly digest API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
