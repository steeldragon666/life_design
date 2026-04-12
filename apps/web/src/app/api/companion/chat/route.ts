/**
 * POST /api/companion/chat
 *
 * Main DRM companion chat endpoint. Authenticates the user, manages sessions
 * and message persistence, wires the PipelineDependencies, runs the DRM
 * pipeline, and returns the assistant response.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { CompanionRequest, ConversationMessage, BackgroundTask } from '@life-design/drm';
import { SafetyTier, ModelTier } from '@life-design/drm';
import { classifySafety } from '@life-design/drm/safety';
import type { SafetySendFn } from '@life-design/drm/safety';
import { generateEmbedding } from '@life-design/drm/client';
import { processMessage } from '@life-design/drm/pipeline';
import type {
  PipelineDependencies,
  MemoryRetrievalResult,
  PipelineClaudeMessage as ClaudeMessage,
} from '@life-design/drm/pipeline';
import type {
  SemanticMemory,
  RelationalMemory,
  TherapeuticMemory,
  EpisodicMemory,
  CommunicationDNA,
  DRMPhase,
  MemoryDetailLevel,
} from '@life-design/drm';
import { EmotionalRegister } from '@life-design/drm';

// ── Supabase row shapes ───────────────────────────────────────────────────────

interface CompanionSessionRow {
  id: string;
  user_id: string;
  started_at: string;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
}

interface CompanionMessageRow {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface EpisodicMemoryRow {
  id: string;
  user_id: string;
  session_id: string;
  timestamp: string;
  summary: string;
  emotional_valence: number;
  topics: string[];
  interventions_used: string[];
  outcome_rating: number | null;
  notable_quotes: string[];
  follow_up: string | null;
  embedding: number[];
  detail_level: string;
  created_at: string;
}

interface SemanticMemoryRow {
  user_id: string;
  life_context: SemanticMemory['lifeContext'];
  psychological_profile: SemanticMemory['psychologicalProfile'];
  therapeutic_preferences: SemanticMemory['therapeuticPreferences'];
  last_updated: string;
}

interface RelationalMemoryRow {
  user_id: string;
  relationship_started: string;
  total_sessions: number;
  total_messages: number;
  trust_trajectory: string;
  current_phase: string;
  interaction_patterns: RelationalMemory['interactionPatterns'];
  milestones: Array<{ date: string; event: string; significance: 'minor' | 'moderate' | 'major' }>;
  rapport_notes: string;
  last_updated: string;
}

interface TherapeuticMemoryRow {
  user_id: string;
  issue_intervention_map: TherapeuticMemory['issueInterventionMap'];
  timing_intelligence: TherapeuticMemory['timingIntelligence'];
  resistance_patterns: TherapeuticMemory['resistancePatterns'];
  last_updated: string;
}

// ── Request body type ─────────────────────────────────────────────────────────

interface ChatRequestBody {
  sessionId?: string;
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

// ── Anthropic client factory ──────────────────────────────────────────────────

function buildAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

// ── SafetySendFn adapter ──────────────────────────────────────────────────────

function buildSafetySendFn(client: Anthropic): SafetySendFn {
  return async (
    model: string,
    system: string,
    message: string,
    maxTokens: number,
    temperature: number,
  ): Promise<{ text: string | null; error: string | null }> => {
    try {
      const response = await client.messages.create({
        model,
        system,
        messages: [{ role: 'user', content: message }],
        max_tokens: maxTokens,
        temperature,
      });
      const textBlock = response.content.find(
        (block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text',
      );
      return { text: textBlock?.text ?? null, error: null };
    } catch (err) {
      return {
        text: null,
        error: err instanceof Error ? err.message : 'Unknown Anthropic error',
      };
    }
  };
}

// ── Pipeline sendMessage adapter ──────────────────────────────────────────────

function buildPipelineSendMessage(client: Anthropic) {
  return async (
    model: string,
    system: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxTokens: number,
    temperature: number,
  ): Promise<ClaudeMessage> => {
    try {
      const messages: Anthropic.MessageParam[] = [
        ...history.map((h) => ({
          role: h.role,
          content: h.content,
        })),
        { role: 'user' as const, content: userMessage },
      ];

      const response = await client.messages.create({
        model,
        system,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const textBlock = response.content.find(
        (block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text',
      );

      return {
        text: textBlock?.text ?? null,
        error: null,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (err) {
      return {
        text: null,
        error: err instanceof Error ? err.message : 'Unknown Anthropic error',
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  };
}

// ── Default memory structures ─────────────────────────────────────────────────

function buildDefaultMemoryResult(userId: string): MemoryRetrievalResult {
  const now = new Date();
  const defaultCommunicationDNA: CommunicationDNA = {
    emotionalRegister: EmotionalRegister.Warm,
    metaphorUsage: 'moderate',
    directnessLevel: 0.5,
    humourLevel: 0.2,
    challengeLevel: 0.3,
    pacing: 'moderate',
    languageComplexity: 'moderate',
  };

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
      currentPhase: 'initial' as DRMPhase,
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
    communicationDNA: defaultCommunicationDNA,
    assessmentData: '',
    userName: 'there',
  };
}

// ── Memory retrieval from Supabase ────────────────────────────────────────────

async function retrieveMemoryFromSupabase(
  userId: string,
): Promise<MemoryRetrievalResult> {
  const supabase = createServiceRoleClient();
  const defaults = buildDefaultMemoryResult(userId);

  const [semanticRes, relationalRes, therapeuticRes, episodicRes] =
    await Promise.allSettled([
      supabase
        .from('semantic_memory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<SemanticMemoryRow>(),
      supabase
        .from('relational_memory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<RelationalMemoryRow>(),
      supabase
        .from('therapeutic_memory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<TherapeuticMemoryRow>(),
      supabase
        .from('episodic_memory')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(50)
        .returns<EpisodicMemoryRow[]>(),
    ]);

  // Semantic
  let semantic: SemanticMemory = defaults.semantic;
  if (semanticRes.status === 'fulfilled' && semanticRes.value.data) {
    const row = semanticRes.value.data;
    semantic = {
      userId: row.user_id,
      lifeContext: row.life_context,
      psychologicalProfile: row.psychological_profile,
      therapeuticPreferences: row.therapeutic_preferences,
      lastUpdated: new Date(row.last_updated),
    };
  }

  // Relational
  let relational: RelationalMemory = defaults.relational;
  if (relationalRes.status === 'fulfilled' && relationalRes.value.data) {
    const row = relationalRes.value.data;
    relational = {
      userId: row.user_id,
      relationshipStarted: new Date(row.relationship_started),
      totalSessions: row.total_sessions,
      totalMessages: row.total_messages,
      trustTrajectory: row.trust_trajectory,
      currentPhase: row.current_phase as DRMPhase,
      interactionPatterns: row.interaction_patterns,
      milestones: row.milestones.map((m) => ({
        date: new Date(m.date),
        event: m.event,
        significance: m.significance,
      })),
      rapportNotes: row.rapport_notes,
      lastUpdated: new Date(row.last_updated),
    };
  }

  // Therapeutic
  let therapeutic: TherapeuticMemory = defaults.therapeutic;
  if (therapeuticRes.status === 'fulfilled' && therapeuticRes.value.data) {
    const row = therapeuticRes.value.data;
    therapeutic = {
      userId: row.user_id,
      issueInterventionMap: row.issue_intervention_map,
      timingIntelligence: row.timing_intelligence,
      resistancePatterns: row.resistance_patterns,
      lastUpdated: new Date(row.last_updated),
    };
  }

  // Episodic
  let episodicMemories: EpisodicMemory[] = [];
  if (episodicRes.status === 'fulfilled' && episodicRes.value.data) {
    episodicMemories = episodicRes.value.data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      timestamp: new Date(row.timestamp),
      summary: row.summary,
      emotionalValence: row.emotional_valence,
      topics: row.topics,
      interventionsUsed: row.interventions_used,
      outcomeRating: row.outcome_rating,
      notableQuotes: row.notable_quotes,
      followUp: row.follow_up,
      embedding: row.embedding,
      detailLevel: row.detail_level as MemoryDetailLevel,
      createdAt: new Date(row.created_at),
    }));
  }

  return {
    ...defaults,
    semantic,
    relational,
    therapeutic,
    episodicMemories,
  };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Parse body
    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { message, sessionId: incomingSessionId, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    const serviceClient = createServiceRoleClient();

    // Session management — create one if not provided
    let sessionId: string;
    if (incomingSessionId) {
      sessionId = incomingSessionId;
    } else {
      const { data: session, error: sessionError } = await serviceClient
        .from('companion_sessions')
        .insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          message_count: 0,
          input_tokens: 0,
          output_tokens: 0,
        })
        .select('id')
        .single<Pick<CompanionSessionRow, 'id'>>();

      if (sessionError || !session) {
        console.error('[companion/chat] Failed to create session:', sessionError);
        return NextResponse.json(
          { error: 'Failed to create companion session' },
          { status: 500 },
        );
      }
      sessionId = session.id;
    }

    // Persist user message
    await serviceClient.from('companion_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    } satisfies Omit<CompanionMessageRow, 'id'>);

    // Build conversation history for the pipeline
    const history: ConversationMessage[] = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }));

    const companionRequest: CompanionRequest = {
      userId: user.id,
      sessionId,
      message: message.trim(),
      conversationHistory: history,
    };

    // Wire dependencies
    const anthropic = buildAnthropicClient();
    const safetySendFn = buildSafetySendFn(anthropic);
    const pipelineSendMessage = buildPipelineSendMessage(anthropic);

    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';

    const deps: PipelineDependencies = {
      sendMessage: pipelineSendMessage,

      classifySafety: (msg: string) => classifySafety(msg, safetySendFn, null),

      retrieveMemory: async (_userId: string, _queryEmbedding: number[]) => {
        return retrieveMemoryFromSupabase(user.id);
      },

      generateEmbedding: (text: string) => generateEmbedding(text, apiKey),

      enqueueBackgroundTask: async (task: BackgroundTask) => {
        console.log('[companion/chat] Background task queued:', task.type, {
          userId: task.userId,
          sessionId: task.sessionId,
          scheduledAt: task.scheduledAt,
        });
      },

      config: {
        companionName: 'Aria',
        models: {
          primary: 'claude-sonnet-4-20250514',
          reasoning: 'claude-opus-4-20250514',
          safety: 'claude-sonnet-4-20250514',
        },
      },
    };

    // Run the DRM pipeline
    const companionResponse = await processMessage(companionRequest, deps);

    // Persist assistant response
    await serviceClient.from('companion_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'assistant',
      content: companionResponse.text,
      created_at: new Date().toISOString(),
    } satisfies Omit<CompanionMessageRow, 'id'>);

    // Update session token usage; message_count is best incremented via a
    // Postgres function to avoid read-modify-write races. Fall back to a
    // direct update when the RPC is not yet deployed.
    await serviceClient
      .rpc('increment_companion_session_stats', {
        p_session_id: sessionId,
        p_message_count_delta: 2, // user + assistant
        p_input_tokens_delta: companionResponse.tokensUsed.input,
        p_output_tokens_delta: companionResponse.tokensUsed.output,
      })
      .then(
        () => {},
        async () => {
          await serviceClient
            .from('companion_sessions')
            .update({
              input_tokens: companionResponse.tokensUsed.input,
              output_tokens: companionResponse.tokensUsed.output,
            })
            .eq('id', sessionId);
        },
      );

    return NextResponse.json({
      text: companionResponse.text,
      sessionId,
      safetyTier: companionResponse.safetyClassification.tier as SafetyTier,
      modelUsed: companionResponse.modelUsed as ModelTier,
    });
  } catch (error) {
    console.error('[companion/chat] Unhandled error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
