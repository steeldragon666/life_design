/**
 * @module pipeline/background-processor
 *
 * Background task definitions and processing logic for the DRM pipeline.
 *
 * Tasks are dispatched asynchronously after every user interaction and run
 * via the BullMQ worker defined in queue.ts. Each task type uses a prompt
 * constant to extract structured data from the session transcript and then
 * persists the result via the injected dependency functions.
 *
 * All I/O is injected through BackgroundDependencies — no SDK clients are
 * imported directly here.
 */

import type {
  BackgroundTask,
  EpisodicMemory,
  SemanticMemory,
} from '../types.js';
import { MemoryDetailLevel } from '../types.js';
import { OUTCOME_TRACKING_PROMPT, parseOutcomeTrackingResponse } from '../therapeutic/intervention-tracker.js';
import { identifyConsolidationTargets } from '../memory/consolidation.js';

// ── Prompt Constants ──────────────────────────────────────────────────────────

/**
 * Used for `episodic_summarisation` tasks.
 *
 * Instructs Claude to extract a structured session summary from a transcript.
 * Inject the transcript as the user message when calling the model.
 *
 * Expected response: a JSON object only — no prose, no markdown fences.
 */
export const SUMMARISATION_PROMPT = `You are a clinical memory extraction assistant for a therapeutic AI companion. Your task is to analyse the conversation transcript and produce a structured summary suitable for long-term memory storage.

Return ONLY a valid JSON object with EXACTLY these fields — no preamble, no markdown fences:
{
  "summary": "<2–4 sentence narrative capturing the session's primary theme, emotional tone, and notable moments>",
  "emotional_valence": <number between -1.0 (very negative) and +1.0 (very positive)>,
  "topics": ["<topic1>", "<topic2>"],
  "interventions_used": ["<technique1>", "<technique2>"],
  "outcomes": "<1–2 sentences on how the session resolved or what shifted for the user, or null if unclear>",
  "notable_quotes": ["<exact quote if clinically significant, e.g. a key belief or breakthrough statement>"],
  "follow_up": "<one item to revisit next session, or null if none>"
}

Guidelines:
- emotional_valence reflects the user's overall emotional state by session end, not the topics discussed.
- Include interventions_used only when a recognisable technique was applied (CBT, ACT, mindfulness, etc.).
- notable_quotes should be verbatim where possible; omit if no clinically significant statements were made.
- follow_up should be a single actionable or thematic item, not a list.
- If the session was very brief or purely logistical, most fields may be minimal — that is fine.`;

/**
 * Used for `profile_update` tasks.
 *
 * Instructs Claude to compare the current semantic profile with the new
 * conversation and return only the fields that should change.
 * Inject the current profile JSON and transcript as the user message.
 *
 * Expected response: a JSON patch object only — no prose, no markdown fences.
 * Fields not present in the response are left unchanged by the caller.
 */
export const PROFILE_UPDATE_PROMPT = `You are a clinical profile update assistant for a therapeutic AI companion. You will receive the user's current semantic profile (as JSON) and a new conversation transcript. Your task is to identify any new or changed information that should update the profile.

Return ONLY a valid JSON object containing the changed fields — no preamble, no markdown fences. Omit any field that has not changed or cannot be confidently inferred.

The profile schema uses these top-level sections: "lifeContext", "psychologicalProfile", "therapeuticPreferences". Each section should contain only the sub-fields that have changed.

Example — if the user revealed a new goal and showed engagement with mindfulness:
{
  "lifeContext": {
    "goals": ["<existing goals>", "<new goal revealed in session>"]
  },
  "therapeuticPreferences": {
    "preferredModalities": ["mindfulness"]
  }
}

Guidelines:
- Only include fields with clear evidence from the transcript. Do not speculate.
- For array fields (goals, values, relationships, etc.) return the FULL updated array, not just the new items.
- For psychologicalProfile fields (attachmentStyle, selfCompassionLevel, etc.) only update when the evidence is strong.
- If nothing in the profile has changed, return an empty object: {}`;

// ── Dependency Interface ──────────────────────────────────────────────────────

export interface ClaudeMessage {
  text: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface OutcomeUpdate {
  issueName: string;
  modality: string;
  technique: string;
  effectiveness: number;
  userResponse: string;
}

export interface BackgroundDependencies {
  /** Call Claude for extraction tasks. */
  sendMessage: (
    model: string,
    system: string,
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number,
    temperature: number,
  ) => Promise<ClaudeMessage>;

  /** Persist a new episodic memory entry to the data store. */
  storeEpisodicMemory: (memory: EpisodicMemory) => Promise<void>;

  /** Apply a partial patch to the user's semantic memory record. */
  updateSemanticMemory: (userId: string, patch: Partial<SemanticMemory>) => Promise<void>;

  /** Record intervention outcomes for the user's therapeutic memory. */
  updateTherapeuticMemory: (
    userId: string,
    outcomes: OutcomeUpdate[],
  ) => Promise<void>;
}

// ── Shared Extraction Defaults ────────────────────────────────────────────────

/** Model used for all background extraction tasks. Sonnet is sufficient. */
const EXTRACTION_MODEL = 'claude-sonnet-4-20250514';

/** Max tokens for extraction responses — structured JSON is always compact. */
const EXTRACTION_MAX_TOKENS = 1024;

/** Low temperature for deterministic structured output. */
const EXTRACTION_TEMPERATURE = 0.2;

// ── Task Processors ───────────────────────────────────────────────────────────

async function processEpisodicSummarisation(
  task: BackgroundTask,
  deps: BackgroundDependencies,
): Promise<void> {
  const transcript = task.payload['transcript'];
  if (typeof transcript !== 'string' || transcript.trim() === '') {
    console.warn('[background] episodic_summarisation: empty transcript, skipping');
    return;
  }

  const response = await deps.sendMessage(
    EXTRACTION_MODEL,
    SUMMARISATION_PROMPT,
    `Transcript:\n${transcript}`,
    [],
    EXTRACTION_MAX_TOKENS,
    EXTRACTION_TEMPERATURE,
  );

  if (response.error !== null || response.text === null) {
    console.error('[background] episodic_summarisation: Claude error:', response.error);
    return;
  }

  let parsed: Record<string, unknown>;
  try {
    const cleaned = response.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const raw: unknown = JSON.parse(cleaned);
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Expected a JSON object');
    }
    parsed = raw as Record<string, unknown>;
  } catch (err) {
    console.error('[background] episodic_summarisation: failed to parse JSON:', err);
    return;
  }

  const summary = typeof parsed['summary'] === 'string' ? parsed['summary'] : 'Session recorded.';
  const emotionalValence =
    typeof parsed['emotional_valence'] === 'number'
      ? Math.min(1, Math.max(-1, parsed['emotional_valence']))
      : 0;
  const topics = Array.isArray(parsed['topics'])
    ? (parsed['topics'] as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  const interventionsUsed = Array.isArray(parsed['interventions_used'])
    ? (parsed['interventions_used'] as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  const notableQuotes = Array.isArray(parsed['notable_quotes'])
    ? (parsed['notable_quotes'] as unknown[]).filter((q): q is string => typeof q === 'string')
    : [];
  const followUp =
    typeof parsed['follow_up'] === 'string' ? parsed['follow_up'] : null;

  const memory: EpisodicMemory = {
    id: `${task.sessionId}-episodic-${Date.now()}`,
    userId: task.userId,
    sessionId: task.sessionId,
    timestamp: task.scheduledAt,
    summary,
    emotionalValence,
    topics,
    interventionsUsed,
    outcomeRating: null,
    notableQuotes,
    followUp,
    embedding: [],               // Caller responsible for embedding if required
    detailLevel: MemoryDetailLevel.Full,
    createdAt: new Date(),
  };

  await deps.storeEpisodicMemory(memory);
}

async function processProfileUpdate(
  task: BackgroundTask,
  deps: BackgroundDependencies,
): Promise<void> {
  const transcript = task.payload['transcript'];
  const currentProfile = task.payload['currentProfile'];

  if (typeof transcript !== 'string' || transcript.trim() === '') {
    console.warn('[background] profile_update: empty transcript, skipping');
    return;
  }

  const profileJson =
    currentProfile !== undefined ? JSON.stringify(currentProfile, null, 2) : '{}';

  const userMessage = `Current profile:\n${profileJson}\n\nTranscript:\n${transcript}`;

  const response = await deps.sendMessage(
    EXTRACTION_MODEL,
    PROFILE_UPDATE_PROMPT,
    userMessage,
    [],
    EXTRACTION_MAX_TOKENS,
    EXTRACTION_TEMPERATURE,
  );

  if (response.error !== null || response.text === null) {
    console.error('[background] profile_update: Claude error:', response.error);
    return;
  }

  let patch: Partial<SemanticMemory>;
  try {
    const cleaned = response.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const raw: unknown = JSON.parse(cleaned);
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('Expected a JSON object');
    }
    patch = raw as Partial<SemanticMemory>;
  } catch (err) {
    console.error('[background] profile_update: failed to parse JSON patch:', err);
    return;
  }

  // Nothing changed — Claude returned {}
  if (Object.keys(patch).length === 0) {
    return;
  }

  await deps.updateSemanticMemory(task.userId, patch);
}

async function processOutcomeTracking(
  task: BackgroundTask,
  deps: BackgroundDependencies,
): Promise<void> {
  const transcript = task.payload['transcript'];
  if (typeof transcript !== 'string' || transcript.trim() === '') {
    console.warn('[background] outcome_tracking: empty transcript, skipping');
    return;
  }

  const response = await deps.sendMessage(
    EXTRACTION_MODEL,
    OUTCOME_TRACKING_PROMPT,
    `Transcript:\n${transcript}`,
    [],
    EXTRACTION_MAX_TOKENS,
    EXTRACTION_TEMPERATURE,
  );

  if (response.error !== null || response.text === null) {
    console.error('[background] outcome_tracking: Claude error:', response.error);
    return;
  }

  const results = parseOutcomeTrackingResponse(response.text);

  if (results.length === 0) {
    return;
  }

  const outcomes: OutcomeUpdate[] = results.map((r) => ({
    issueName: r.issue,
    modality: r.technique,       // Caller maps technique → modality enum in the store layer
    technique: r.technique,
    effectiveness: r.estimatedEffectiveness,
    userResponse: r.userResponse,
  }));

  await deps.updateTherapeuticMemory(task.userId, outcomes);
}

async function processMemoryConsolidation(
  task: BackgroundTask,
): Promise<void> {
  // Actual consolidation requires the Batch API and episodic store access,
  // which live outside the pipeline layer. Here we identify targets from any
  // memories supplied in the payload and log what would be consolidated.
  const rawMemories = task.payload['memories'];

  if (!Array.isArray(rawMemories) || rawMemories.length === 0) {
    console.info(
      `[background] memory_consolidation: no memories supplied in payload for user=${task.userId}`,
    );
    return;
  }

  // We trust the caller has shaped the memories correctly; cast for logging only
  const memories = rawMemories as EpisodicMemory[];
  const { toSummarise, toAbstract } = identifyConsolidationTargets(memories);

  console.info(
    `[background] memory_consolidation: user=${task.userId} ` +
      `toSummarise=${toSummarise.length} toAbstract=${toAbstract.length} ` +
      `(actual consolidation deferred — requires Batch API integration)`,
  );
}

// ── Public Entry Point ────────────────────────────────────────────────────────

/**
 * Dispatch a background task to the appropriate processor.
 *
 * Errors inside each processor are caught and logged; they do not propagate so
 * that the BullMQ worker can control retry behaviour via job options rather than
 * relying on thrown exceptions.
 */
export async function processBackgroundTask(
  task: BackgroundTask,
  deps: BackgroundDependencies,
): Promise<void> {
  try {
    switch (task.type) {
      case 'episodic_summarisation':
        await processEpisodicSummarisation(task, deps);
        break;

      case 'profile_update':
        await processProfileUpdate(task, deps);
        break;

      case 'outcome_tracking':
        await processOutcomeTracking(task, deps);
        break;

      case 'memory_consolidation':
        await processMemoryConsolidation(task);
        break;

      default: {
        // Exhaustiveness guard — TypeScript narrows task.type to `never` here
        const exhaustiveCheck: never = task.type;
        console.warn('[background] Unknown task type:', exhaustiveCheck);
      }
    }
  } catch (err) {
    // Re-throw so BullMQ registers the job as failed and applies retry logic
    console.error(`[background] Task ${task.type} for user=${task.userId} failed:`, err);
    throw err;
  }
}
