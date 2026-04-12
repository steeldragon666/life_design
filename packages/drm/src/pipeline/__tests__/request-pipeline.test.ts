import { processMessage } from '../request-pipeline.js';
import type { PipelineDependencies, ClaudeMessage, MemoryRetrievalResult } from '../request-pipeline.js';
import type {
  CompanionRequest,
  SafetyClassification,
  BackgroundTask,
} from '../../types.js';
import { SafetyTier, ModelTier, DRMPhase } from '../../types.js';

// ── Fixture Factories ─────────────────────────────────────────────────────────

function makeRequest(overrides: Partial<CompanionRequest> = {}): CompanionRequest {
  return {
    userId: 'u-pipeline-test',
    sessionId: 'sess-001',
    message: 'I have been feeling anxious about work.',
    conversationHistory: [],
    ...overrides,
  };
}

function makeSafetyClassification(tier: SafetyTier): SafetyClassification {
  return {
    tier,
    signal: tier === SafetyTier.Tier1_Immediate ? 'suicidal ideation' : null,
    confidence: 0.95,
    timestamp: new Date(),
  };
}

function makeMemoryResult(): MemoryRetrievalResult {
  const now = new Date();
  return {
    semantic: {
      userId: 'u-pipeline-test',
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
      userId: 'u-pipeline-test',
      relationshipStarted: now,
      totalSessions: 3,
      totalMessages: 20,
      trustTrajectory: 'building',
      currentPhase: DRMPhase.Initial,
      interactionPatterns: {
        typicalFrequency: 'weekly',
        typicalDuration: '20–35 minutes',
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
      userId: 'u-pipeline-test',
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
      emotionalRegister: 'warm' as const,
      metaphorUsage: 'moderate' as const,
      directnessLevel: 0.5,
      humourLevel: 0.2,
      challengeLevel: 0.3,
      pacing: 'moderate' as const,
      languageComplexity: 'moderate' as const,
    },
    assessmentData: '',
    userName: 'Alex',
  };
}

function makeSuccessfulClaudeMessage(text = 'That sounds really difficult.'): ClaudeMessage {
  return { text, error: null, inputTokens: 100, outputTokens: 50 };
}

function makeConfig() {
  return {
    companionName: 'Sage',
    models: {
      primary: 'claude-sonnet-4-20250514',
      reasoning: 'claude-opus-4-20250514',
      safety: 'claude-sonnet-4-20250514',
    },
  };
}

/** Build a basic PipelineDependencies mock with all stubs returning happy-path defaults. */
function makeDeps(overrides: Partial<PipelineDependencies> = {}): PipelineDependencies {
  const enqueuedTasks: BackgroundTask[] = [];

  return {
    sendMessage: async () => makeSuccessfulClaudeMessage(),
    classifySafety: async () => makeSafetyClassification(SafetyTier.Tier3_NoRisk),
    retrieveMemory: async () => makeMemoryResult(),
    generateEmbedding: async () => new Array(1536).fill(0),
    enqueueBackgroundTask: async (task) => {
      enqueuedTasks.push(task);
    },
    config: makeConfig(),
    ...overrides,
    // Expose for assertions via a non-interface property (used in test closure)
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('processMessage', () => {
  describe('normal flow — Tier 3 (no risk)', () => {
    it('returns a CompanionResponse with the Claude reply text', async () => {
      const deps = makeDeps({
        sendMessage: async () => makeSuccessfulClaudeMessage('Hello, I hear you.'),
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.text).toBe('Hello, I hear you.');
    });

    it('returns the correct sessionId', async () => {
      const response = await processMessage(makeRequest({ sessionId: 'sess-xyz' }), makeDeps());
      expect(response.sessionId).toBe('sess-xyz');
    });

    it('uses Sonnet model for Tier 3', async () => {
      const response = await processMessage(makeRequest(), makeDeps());
      expect(response.modelUsed).toBe(ModelTier.Sonnet);
    });

    it('includes tokensUsed with input and output counts', async () => {
      const deps = makeDeps({
        sendMessage: async () => ({
          text: 'OK',
          error: null,
          inputTokens: 200,
          outputTokens: 80,
        }),
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.tokensUsed.input).toBe(200);
      expect(response.tokensUsed.output).toBe(80);
    });

    it('includes safetyClassification in the response', async () => {
      const response = await processMessage(makeRequest(), makeDeps());
      expect(response.safetyClassification).toBeDefined();
      expect(response.safetyClassification.tier).toBe(SafetyTier.Tier3_NoRisk);
    });
  });

  describe('crisis flow — Tier 1 (immediate)', () => {
    it('uses Opus model for Tier 1', async () => {
      const deps = makeDeps({
        classifySafety: async () => makeSafetyClassification(SafetyTier.Tier1_Immediate),
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.modelUsed).toBe(ModelTier.Opus);
    });

    it('uses the reasoning model identifier for Tier 1', async () => {
      let capturedModel: string | undefined;
      const deps = makeDeps({
        classifySafety: async () => makeSafetyClassification(SafetyTier.Tier1_Immediate),
        sendMessage: async (model, ...rest) => {
          capturedModel = model;
          void rest;
          return makeSuccessfulClaudeMessage();
        },
      });

      await processMessage(makeRequest(), deps);
      expect(capturedModel).toBe('claude-opus-4-20250514');
    });

    it('injects crisis system prompt for Tier 1', async () => {
      let capturedSystemPrompt: string | undefined;
      const deps = makeDeps({
        classifySafety: async () => makeSafetyClassification(SafetyTier.Tier1_Immediate),
        sendMessage: async (_model, system, ...rest) => {
          capturedSystemPrompt = system;
          void rest;
          return makeSuccessfulClaudeMessage();
        },
      });

      await processMessage(makeRequest(), deps);
      // The crisis system prompt override should replace normal prompt
      expect(capturedSystemPrompt).toContain('compassionate AI companion');
    });

    it('returns the Tier 1 safety classification in response', async () => {
      const deps = makeDeps({
        classifySafety: async () => makeSafetyClassification(SafetyTier.Tier1_Immediate),
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.safetyClassification.tier).toBe(SafetyTier.Tier1_Immediate);
    });
  });

  describe('safety classification failure — fail open', () => {
    it('continues processing when classifier throws', async () => {
      const deps = makeDeps({
        classifySafety: async () => {
          throw new Error('classifier service unavailable');
        },
        sendMessage: async () => makeSuccessfulClaudeMessage('Fallback response.'),
      });

      const response = await processMessage(makeRequest(), deps);
      // Should still return a response (fail open)
      expect(response.text).toBeDefined();
      expect(response.text).not.toBe('');
    });

    it('defaults to Tier 3 when classifier throws', async () => {
      const deps = makeDeps({
        classifySafety: async () => {
          throw new Error('timeout');
        },
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.safetyClassification.tier).toBe(SafetyTier.Tier3_NoRisk);
    });

    it('uses Sonnet (not Opus) when failing open', async () => {
      const deps = makeDeps({
        classifySafety: async () => {
          throw new Error('fail');
        },
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.modelUsed).toBe(ModelTier.Sonnet);
    });
  });

  describe('Claude failure', () => {
    it('returns a graceful error message when sendMessage throws', async () => {
      const deps = makeDeps({
        sendMessage: async () => {
          throw new Error('network error');
        },
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.text).toContain("I'm having trouble connecting");
    });

    it('returns a graceful error message when Claude returns error field', async () => {
      const deps = makeDeps({
        sendMessage: async () => ({
          text: null,
          error: 'overload',
          inputTokens: 0,
          outputTokens: 0,
        }),
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.text).toContain("I'm having trouble connecting");
    });

    it('returns sessionId even on Claude failure', async () => {
      const deps = makeDeps({
        sendMessage: async () => {
          throw new Error('fail');
        },
      });

      const response = await processMessage(makeRequest({ sessionId: 'fail-sess' }), deps);
      expect(response.sessionId).toBe('fail-sess');
    });
  });

  describe('background task enqueueing', () => {
    it('enqueues exactly 3 background tasks on success', async () => {
      const enqueuedTasks: BackgroundTask[] = [];
      const deps = makeDeps({
        enqueueBackgroundTask: async (task) => {
          enqueuedTasks.push(task);
        },
      });

      await processMessage(makeRequest(), deps);

      // Allow the fire-and-forget promises to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(enqueuedTasks).toHaveLength(3);
    });

    it('enqueues episodic_summarisation task', async () => {
      const enqueuedTasks: BackgroundTask[] = [];
      const deps = makeDeps({
        enqueueBackgroundTask: async (task) => {
          enqueuedTasks.push(task);
        },
      });

      await processMessage(makeRequest(), deps);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const types = enqueuedTasks.map((t) => t.type);
      expect(types).toContain('episodic_summarisation');
    });

    it('enqueues profile_update task', async () => {
      const enqueuedTasks: BackgroundTask[] = [];
      const deps = makeDeps({
        enqueueBackgroundTask: async (task) => {
          enqueuedTasks.push(task);
        },
      });

      await processMessage(makeRequest(), deps);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const types = enqueuedTasks.map((t) => t.type);
      expect(types).toContain('profile_update');
    });

    it('enqueues outcome_tracking task', async () => {
      const enqueuedTasks: BackgroundTask[] = [];
      const deps = makeDeps({
        enqueueBackgroundTask: async (task) => {
          enqueuedTasks.push(task);
        },
      });

      await processMessage(makeRequest(), deps);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const types = enqueuedTasks.map((t) => t.type);
      expect(types).toContain('outcome_tracking');
    });

    it('background task failures do not cause the pipeline to throw', async () => {
      const deps = makeDeps({
        enqueueBackgroundTask: async () => {
          throw new Error('queue unavailable');
        },
      });

      // Should not throw
      await expect(processMessage(makeRequest(), deps)).resolves.toBeDefined();
    });

    it('each enqueued task has the correct userId and sessionId', async () => {
      const enqueuedTasks: BackgroundTask[] = [];
      const deps = makeDeps({
        enqueueBackgroundTask: async (task) => {
          enqueuedTasks.push(task);
        },
      });

      await processMessage(makeRequest({ userId: 'u-check', sessionId: 'sess-check' }), deps);
      await new Promise((resolve) => setTimeout(resolve, 10));

      for (const task of enqueuedTasks) {
        expect(task.userId).toBe('u-check');
        expect(task.sessionId).toBe('sess-check');
      }
    });
  });

  describe('memory retrieval failure', () => {
    it('proceeds with empty context when memory retrieval throws', async () => {
      const deps = makeDeps({
        retrieveMemory: async () => {
          throw new Error('database unavailable');
        },
        sendMessage: async () => makeSuccessfulClaudeMessage('Graceful response.'),
      });

      const response = await processMessage(makeRequest(), deps);
      expect(response.text).toBe('Graceful response.');
    });
  });
});
