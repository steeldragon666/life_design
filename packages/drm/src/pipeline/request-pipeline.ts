/**
 * @module pipeline/request-pipeline
 *
 * The DRM request pipeline processes every user message through 7 steps:
 * 1. Safety classification (parallel)
 * 2. Memory retrieval (parallel)
 * 3. Safety gate
 * 4. Context assembly
 * 5. Conversational engine (Claude)
 * 6. Response to user
 * 7. Background processing (async, non-blocking)
 *
 * Pure orchestration. All I/O is injected via PipelineDependencies so that the
 * pipeline itself remains fully testable without live SDK clients.
 */

import type {
  BackgroundTask,
  CommunicationDNA,
  CompanionRequest,
  CompanionResponse,
  ConversationMessage,
  EpisodicMemory,
  RelationalMemory,
  SafetyClassification,
  SemanticMemory,
  TherapeuticMemory,
} from '../types.js';
import { ModelTier, SafetyTier } from '../types.js';
import { buildCrisisProtocol } from '../safety/escalation.js';
import { retrieveAllMemoryLayers } from '../memory/retrieval.js';
import { assembleContext, DEFAULT_TOKEN_BUDGETS } from '../engine/context-assembly.js';

// ── Cosine Similarity ─────────────────────────────────────────────────────────

/**
 * Standard cosine similarity between two equal-length numeric vectors.
 * Returns 0 when either vector has zero magnitude to avoid NaN.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Dependency Interface ──────────────────────────────────────────────────────

export interface ClaudeMessage {
  text: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface MemoryRetrievalResult {
  semantic: SemanticMemory;
  relational: RelationalMemory;
  therapeutic: TherapeuticMemory;
  episodicMemories: EpisodicMemory[];
  communicationDNA: CommunicationDNA;
  assessmentData: string;
  userName: string;
}

export interface PipelineDependencies {
  /** Send a message to Claude. Model, system prompt, history, and budget are caller-controlled. */
  sendMessage: (
    model: string,
    system: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number,
    temperature: number,
  ) => Promise<ClaudeMessage>;

  /** Classify the safety tier of the incoming message. */
  classifySafety: (message: string) => Promise<SafetyClassification>;

  /** Retrieve all memory layers for the user, pre-fetched from the data store. */
  retrieveMemory: (
    userId: string,
    queryEmbedding: number[],
  ) => Promise<MemoryRetrievalResult>;

  /** Generate a semantic embedding vector for the given text. */
  generateEmbedding: (text: string) => Promise<number[]>;

  /** Dispatch a background task to the queue (fire-and-forget from the pipeline). */
  enqueueBackgroundTask: (task: BackgroundTask) => Promise<void>;

  /** Runtime configuration: companion name and model identifiers. */
  config: {
    companionName: string;
    models: {
      primary: string;
      reasoning: string;
      safety: string;
    };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the flat conversation history array that Claude expects (no timestamps). */
function buildClaudeHistory(
  history: ConversationMessage[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return history.map(({ role, content }) => ({ role, content }));
}

/** Build a session transcript string from conversation history + new message. */
function buildTranscript(
  history: ConversationMessage[],
  userMessage: string,
  assistantReply: string,
): string {
  const lines: string[] = history.map(
    (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
  );
  lines.push(`User: ${userMessage}`);
  lines.push(`Assistant: ${assistantReply}`);
  return lines.join('\n');
}

/** Default SafetyClassification used when the safety classifier itself errors. */
function failOpenSafetyClassification(): SafetyClassification {
  return {
    tier: SafetyTier.Tier3_NoRisk,
    signal: null,
    confidence: 0,
    timestamp: new Date(),
  };
}

/** Empty memory result used when memory retrieval fails. */
function emptyMemoryResult(userId: string): MemoryRetrievalResult {
  const now = new Date();
  return {
    semantic: {
      userId,
      lifeContext: {
        relationships: [],
        work: null,
        healthConditions: [],
        medications: [],
        goals: [],
        values: [],
        interests: [],
        culturalBackground: null,
        spiritualOrientation: null,
      },
      psychologicalProfile: {
        attachmentStyle: null,
        commonDistortions: [],
        copingStrengths: [],
        copingGaps: [],
        personalityTraits: {},
        gritScore: null,
        selfCompassionLevel: null,
        locusOfControl: null,
      },
      therapeuticPreferences: {
        preferredModalities: [],
        communicationStyle: null,
        depthPreference: 'medium',
        metaphorPreference: 'mixed',
        pacingPreference: 'mixed',
        culturalContext: null,
      },
      lastUpdated: now,
    },
    relational: {
      userId,
      relationshipStarted: now,
      totalSessions: 0,
      totalMessages: 0,
      trustTrajectory: 'unknown',
      currentPhase: 'initial' as RelationalMemory['currentPhase'],
      interactionPatterns: {
        typicalFrequency: 'unknown',
        typicalDuration: 'unknown',
        preferredTimes: [],
        topicsApproached: [],
        topicsAvoided: [],
        engagementTrend: 'stable',
      },
      milestones: [],
      rapportNotes: '',
      lastUpdated: now,
    },
    therapeutic: {
      userId,
      issueInterventionMap: [],
      timingIntelligence: {
        pushTopics: [],
        holdSpaceTopics: [],
        dayPatterns: {},
        bestInterventionTiming: null,
      },
      resistancePatterns: [],
      lastUpdated: now,
    },
    episodicMemories: [],
    communicationDNA: {
      emotionalRegister: 'warm' as CommunicationDNA['emotionalRegister'],
      metaphorUsage: 'moderate',
      directnessLevel: 0.5,
      humourLevel: 0.2,
      challengeLevel: 0.3,
      pacing: 'moderate',
      languageComplexity: 'moderate',
    },
    assessmentData: '',
    userName: 'there',
  };
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Process a single user message through the full DRM pipeline.
 *
 * Steps:
 *   1+2. Run safety classification and embedding + memory retrieval in parallel.
 *   3.   Safety gate: Tier 1 = crisis system prompt override; Tier 2 = overlay append.
 *   4.   Assemble context from all memory blocks.
 *   5.   Call Claude with the assembled system prompt and conversation history.
 *   6.   Return the CompanionResponse to the caller.
 *   7.   Fire-and-forget: enqueue episodic_summarisation, profile_update, outcome_tracking.
 *
 * Error handling:
 *   - Safety classification failure → fail open as Tier 3 (no risk assumed).
 *   - Memory retrieval failure → proceed with empty context.
 *   - Claude failure → return a graceful error response.
 *   - Background task enqueue failures are logged but never surface to the user.
 */
export async function processMessage(
  request: CompanionRequest,
  deps: PipelineDependencies,
): Promise<CompanionResponse> {
  const { userId, sessionId, message, conversationHistory } = request;

  // ── Step 1+2: parallel safety classification + embedding & memory retrieval ──

  let safetyClassification: SafetyClassification;
  let memoryResult: MemoryRetrievalResult;
  let queryEmbedding: number[];

  const [safetyResult, embeddingAndMemory] = await Promise.allSettled([
    deps.classifySafety(message),
    deps
      .generateEmbedding(message)
      .then((embedding) =>
        deps
          .retrieveMemory(userId, embedding)
          .then((mem) => ({ embedding, memory: mem })),
      ),
  ]);

  // Safety: fail open to Tier 3 if classifier errors
  if (safetyResult.status === 'fulfilled') {
    safetyClassification = safetyResult.value;
  } else {
    console.error('[pipeline] Safety classification failed:', safetyResult.reason);
    safetyClassification = failOpenSafetyClassification();
  }

  // Memory: proceed with empty context if retrieval errors
  if (embeddingAndMemory.status === 'fulfilled') {
    queryEmbedding = embeddingAndMemory.value.embedding;
    memoryResult = embeddingAndMemory.value.memory;
  } else {
    console.error('[pipeline] Memory retrieval failed:', embeddingAndMemory.reason);
    queryEmbedding = [];
    memoryResult = emptyMemoryResult(userId);
  }

  // ── Step 3: safety gate ───────────────────────────────────────────────────────

  const crisisProtocol = buildCrisisProtocol(
    safetyClassification.tier,
    safetyClassification.signal,
  );

  // ── Step 4: context assembly ──────────────────────────────────────────────────

  const retrievedContext = retrieveAllMemoryLayers({
    semantic: memoryResult.semantic,
    relational: memoryResult.relational,
    therapeutic: memoryResult.therapeutic,
    episodicMemories: memoryResult.episodicMemories,
    queryEmbedding,
    cosineSimilarityFn: cosineSimilarity,
    tokenBudgets: {
      semantic: DEFAULT_TOKEN_BUDGETS.semanticMemory,
      relational: DEFAULT_TOKEN_BUDGETS.relationalMemory,
      therapeutic: DEFAULT_TOKEN_BUDGETS.therapeuticMemory,
      episodicRecent: DEFAULT_TOKEN_BUDGETS.episodicRecent,
      episodicRelevant: DEFAULT_TOKEN_BUDGETS.episodicRelevant,
    },
  });

  // Determine model tier: Tier 1 safety events escalate to reasoning model
  const modelTier =
    safetyClassification.tier === SafetyTier.Tier1_Immediate
      ? ModelTier.Opus
      : ModelTier.Sonnet;

  const assembled = assembleContext({
    companionName: deps.config.companionName,
    userName: memoryResult.userName,
    semanticBlock: retrievedContext.semanticBlock,
    relationalBlock: retrievedContext.relationalBlock,
    therapeuticBlock: retrievedContext.therapeuticBlock,
    episodicRecentBlock: retrievedContext.episodicRecentBlock,
    episodicRelevantBlock: retrievedContext.episodicRelevantBlock,
    assessmentDataBlock: memoryResult.assessmentData,
    communicationDNA: memoryResult.communicationDNA,
    currentPhase: memoryResult.relational.currentPhase,
    // Tier 2 safety overlay is appended; Tier 1 replaces via systemPromptOverride below
    safetyOverlay:
      safetyClassification.tier === SafetyTier.Tier2_Elevated
        ? crisisProtocol.systemPromptOverride
        : null,
    conversationHistory,
    modelTier,
  });

  // Tier 1: override the entire system prompt with the crisis protocol
  const systemPrompt =
    safetyClassification.tier === SafetyTier.Tier1_Immediate &&
    crisisProtocol.systemPromptOverride !== null
      ? crisisProtocol.systemPromptOverride
      : assembled.systemPrompt;

  // Select concrete model identifier
  const modelId =
    modelTier === ModelTier.Opus
      ? deps.config.models.reasoning
      : deps.config.models.primary;

  // ── Step 5: call Claude ───────────────────────────────────────────────────────

  const claudeHistory = buildClaudeHistory(conversationHistory);

  let claudeResponse: ClaudeMessage;
  try {
    claudeResponse = await deps.sendMessage(
      modelId,
      systemPrompt,
      message,
      claudeHistory,
      DEFAULT_TOKEN_BUDGETS.conversation,
      0.7,
    );
  } catch (err) {
    console.error('[pipeline] Claude sendMessage threw:', err);
    return {
      text: "I'm having trouble connecting right now. Please try again in a moment.",
      sessionId,
      safetyClassification,
      modelUsed: modelTier,
      tokensUsed: { input: 0, output: 0 },
    };
  }

  if (claudeResponse.error !== null || claudeResponse.text === null) {
    console.error('[pipeline] Claude returned an error:', claudeResponse.error);
    return {
      text: "I'm having trouble connecting right now. Please try again in a moment.",
      sessionId,
      safetyClassification,
      modelUsed: modelTier,
      tokensUsed: {
        input: claudeResponse.inputTokens,
        output: claudeResponse.outputTokens,
      },
    };
  }

  const replyText = claudeResponse.text;

  // ── Step 6: build response ────────────────────────────────────────────────────

  const companionResponse: CompanionResponse = {
    text: replyText,
    sessionId,
    safetyClassification,
    modelUsed: modelTier,
    tokensUsed: {
      input: claudeResponse.inputTokens,
      output: claudeResponse.outputTokens,
    },
  };

  // ── Step 7: fire-and-forget background tasks ──────────────────────────────────

  const transcript = buildTranscript(conversationHistory, message, replyText);
  const scheduledAt = new Date();

  const backgroundTasks: BackgroundTask[] = [
    {
      type: 'episodic_summarisation',
      userId,
      sessionId,
      payload: { transcript },
      scheduledAt,
    },
    {
      type: 'profile_update',
      userId,
      sessionId,
      payload: {
        transcript,
        currentProfile: memoryResult.semantic,
      },
      scheduledAt,
    },
    {
      type: 'outcome_tracking',
      userId,
      sessionId,
      payload: { transcript },
      scheduledAt,
    },
  ];

  // Enqueue all three tasks concurrently; failures are logged, never surfaced
  void Promise.allSettled(
    backgroundTasks.map((task) =>
      deps.enqueueBackgroundTask(task).catch((err: unknown) => {
        console.error(`[pipeline] Failed to enqueue ${task.type}:`, err);
      }),
    ),
  );

  return companionResponse;
}
