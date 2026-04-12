import {
  estimateTokenCount,
  assembleContext,
  DEFAULT_TOKEN_BUDGETS,
  ContextAssemblyParams,
} from '../context-assembly';
import { createDefaultCommunicationDNA } from '../communication-dna';
import { DRMPhase, ModelTier } from '../../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildParams(overrides: Partial<ContextAssemblyParams> = {}): ContextAssemblyParams {
  return {
    companionName: 'Sage',
    userName: 'Alex',
    semanticBlock: '## Semantic\nSome semantic data.',
    relationalBlock: '## Relational\nSession count: 5.',
    therapeuticBlock: '## Therapeutic\nCBT noted.',
    episodicRecentBlock: '## Recent\n[2025-01-01]\nSummary: recent session.',
    episodicRelevantBlock: '## Relevant\n[2024-12-01]\nSummary: older relevant session.',
    assessmentDataBlock: 'PHQ-9 score: 7',
    communicationDNA: createDefaultCommunicationDNA(),
    currentPhase: DRMPhase.Initial,
    safetyOverlay: null,
    conversationHistory: [],
    modelTier: ModelTier.Sonnet,
    ...overrides,
  };
}

// ── estimateTokenCount ────────────────────────────────────────────────────────

describe('estimateTokenCount', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('gives reasonable estimate (~4 chars per token)', () => {
    const text = 'A'.repeat(400); // 400 chars → ~100 tokens
    const estimate = estimateTokenCount(text);
    expect(estimate).toBeGreaterThanOrEqual(90);
    expect(estimate).toBeLessThanOrEqual(110);
  });

  it('rounds up for partial token', () => {
    const text = 'A'.repeat(5); // 5 chars → ceil(5/4) = 2
    expect(estimateTokenCount(text)).toBe(2);
  });

  it('is consistent across calls', () => {
    const text = 'Hello world, this is a test sentence.';
    expect(estimateTokenCount(text)).toBe(estimateTokenCount(text));
  });
});

// ── DEFAULT_TOKEN_BUDGETS ─────────────────────────────────────────────────────

describe('DEFAULT_TOKEN_BUDGETS', () => {
  it('total is greater than 20000', () => {
    expect(DEFAULT_TOKEN_BUDGETS.total).toBeGreaterThan(20000);
  });

  it('conversation budget is the largest single budget', () => {
    const { conversation, total, ...rest } = DEFAULT_TOKEN_BUDGETS;
    void total;
    const otherMax = Math.max(...Object.values(rest).filter((v) => typeof v === 'number'));
    expect(conversation).toBeGreaterThan(otherMax);
  });

  it('has all required budget keys', () => {
    const required = [
      'basePrompt',
      'semanticMemory',
      'relationalMemory',
      'episodicRecent',
      'episodicRelevant',
      'therapeuticMemory',
      'assessmentData',
      'conversation',
      'safetyOverlay',
      'total',
    ];
    for (const key of required) {
      expect(DEFAULT_TOKEN_BUDGETS).toHaveProperty(key);
    }
  });

  it('all budget values are positive numbers', () => {
    for (const value of Object.values(DEFAULT_TOKEN_BUDGETS)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });
});

// ── assembleContext ───────────────────────────────────────────────────────────

describe('assembleContext', () => {
  it('returns an AssembledContext with required fields', () => {
    const result = assembleContext(buildParams());
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('totalTokenEstimate');
    expect(result).toHaveProperty('memoryBudget');
    expect(result).toHaveProperty('safetyOverlay');
    expect(result).toHaveProperty('modelTier');
  });

  it('systemPrompt includes the companion name', () => {
    const result = assembleContext(buildParams({ companionName: 'Luna' }));
    expect(result.systemPrompt).toContain('Luna');
  });

  it('systemPrompt includes the user name', () => {
    const result = assembleContext(buildParams({ userName: 'Jordan' }));
    expect(result.systemPrompt).toContain('Jordan');
  });

  it('systemPrompt includes all memory sections', () => {
    const result = assembleContext(buildParams());
    expect(result.systemPrompt).toContain('Semantic Memory');
    expect(result.systemPrompt).toContain('Relational Memory');
    expect(result.systemPrompt).toContain('Therapeutic Memory');
    expect(result.systemPrompt).toContain('Recent Episodes');
    expect(result.systemPrompt).toContain('Relevant Past Episodes');
    expect(result.systemPrompt).toContain('Assessment Data');
  });

  it('includes safety overlay when provided', () => {
    const result = assembleContext(
      buildParams({ safetyOverlay: 'SAFETY CONTEXT: user at risk' }),
    );
    expect(result.systemPrompt).toContain('SAFETY CONTEXT: user at risk');
    expect(result.safetyOverlay).toBe('SAFETY CONTEXT: user at risk');
  });

  it('excludes safety overlay section when safetyOverlay is null', () => {
    const result = assembleContext(buildParams({ safetyOverlay: null }));
    expect(result.safetyOverlay).toBeNull();
    expect(result.systemPrompt).not.toContain('SAFETY OVERLAY');
  });

  it('uses fallback text when semantic block is empty', () => {
    const result = assembleContext(buildParams({ semanticBlock: '' }));
    expect(result.systemPrompt).toContain('No semantic profile has been built yet');
  });

  it('uses fallback text when relational block is empty', () => {
    const result = assembleContext(buildParams({ relationalBlock: '' }));
    expect(result.systemPrompt).toContain('No relational history yet');
  });

  it('includes phase-specific instructions for Initial phase', () => {
    const result = assembleContext(buildParams({ currentPhase: DRMPhase.Initial }));
    expect(result.systemPrompt).toContain('Initial');
  });

  it('includes phase-specific instructions for Deepening phase', () => {
    const result = assembleContext(buildParams({ currentPhase: DRMPhase.Deepening }));
    expect(result.systemPrompt).toContain('Deepening');
  });

  it('propagates modelTier correctly', () => {
    const result = assembleContext(buildParams({ modelTier: ModelTier.Opus }));
    expect(result.modelTier).toBe(ModelTier.Opus);
  });

  it('totalTokenEstimate is a positive integer', () => {
    const result = assembleContext(buildParams());
    expect(result.totalTokenEstimate).toBeGreaterThan(0);
    expect(Number.isInteger(result.totalTokenEstimate)).toBe(true);
  });
});
