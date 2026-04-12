/**
 * @module engine/context-assembly
 *
 * Core system prompt builder for the Deep Relational Model.
 * Assembles all memory layers and therapeutic context into a structured
 * system prompt for the companion AI, with token budget tracking.
 */

import type {
  AssembledContext,
  CommunicationDNA,
  ConversationMessage,
  TokenBudget,
} from '../types.js';
import { DRMPhase, ModelTier } from '../types.js';
import { formatCommunicationDNA } from './communication-dna.js';

// ── Token Budget ─────────────────────────────────────────────────────────────

/**
 * Default token budgets per memory layer.
 * Total ~27 300 leaves headroom for model response within 32k context windows.
 */
export const DEFAULT_TOKEN_BUDGETS: TokenBudget = {
  basePrompt: 3000,
  semanticMemory: 1500,
  relationalMemory: 800,
  episodicRecent: 3000,
  episodicRelevant: 2000,
  therapeuticMemory: 1000,
  assessmentData: 500,
  conversation: 15000,
  safetyOverlay: 500,
  total: 27300,
};

// ── Token Estimation ─────────────────────────────────────────────────────────

/**
 * Rough token count estimator: 1 token ≈ 4 characters.
 * Good enough for budget tracking; not a substitute for the model's tokeniser.
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Context Assembly Params ──────────────────────────────────────────────────

export interface ContextAssemblyParams {
  companionName: string;
  userName: string;
  semanticBlock: string;
  relationalBlock: string;
  therapeuticBlock: string;
  episodicRecentBlock: string;
  episodicRelevantBlock: string;
  assessmentDataBlock: string;
  communicationDNA: CommunicationDNA;
  currentPhase: DRMPhase;
  safetyOverlay: string | null;
  conversationHistory: ConversationMessage[];
  modelTier: ModelTier;
}

// ── Phase-Aware Instructions ─────────────────────────────────────────────────

function buildPhaseInstructions(phase: DRMPhase): string {
  switch (phase) {
    case DRMPhase.Initial:
      return [
        '## Phase: Initial (Assessment & Rapport)',
        'You are in the early rapport-building phase. Your primary goals are:',
        '- Use motivational interviewing (MI) to understand the user\'s world without judgment.',
        '- Gently assess their situation through natural conversation, not direct questionnaires.',
        '- Do NOT push therapeutic interventions yet — focus entirely on understanding and being present.',
        '- Ask open-ended questions. Reflect back what you hear. Validate before exploring.',
        '- Surface what matters most to the user by following their lead.',
      ].join('\n');

    case DRMPhase.Calibration:
      return [
        '## Phase: Calibration (Modality Testing)',
        'You are calibrating which therapeutic approaches resonate with this person. Your goals are:',
        '- Gently introduce a variety of approaches: cognitive reframes (CBT), values clarification (ACT),',
        '  self-compassion exercises (CFT), behavioural experiments (BA), and mindfulness practices.',
        '- Observe carefully: what does the user engage with? What do they resist or redirect away from?',
        '- Note implicit feedback — enthusiasm, deflection, deeper sharing — and adapt accordingly.',
        '- Still prioritise rapport; interventions should feel like natural conversation, not homework.',
      ].join('\n');

    case DRMPhase.Personalised:
      return [
        '## Phase: Personalised (Tailored Interventions)',
        'You now have enough context to deliver highly personalised support. Your goals are:',
        '- Draw on therapeutic memory to use the approaches that have worked best for this person.',
        '- Reference what you\'ve learned about their patterns, language, and what moves them.',
        '- Offer targeted interventions with confidence — you know what resonates.',
        '- Continue adapting based on session-by-session feedback.',
        '- Begin to gently name patterns when the user is ready to hear them.',
      ].join('\n');

    case DRMPhase.Deepening:
      return [
        '## Phase: Deepening (Growth & Pattern Integration)',
        'This is a long-term therapeutic relationship with rich shared history. Your goals are:',
        '- Reference your shared journey — specific moments, breakthroughs, and turning points.',
        '- Celebrate growth concretely: "Remember when X felt impossible? Look where you are now."',
        '- Gently revisit recurring patterns with compassion, not repetition.',
        '- Co-create meaning: help the user author their growth narrative.',
        '- Hold space for complexity — they know you know them. Go deeper.',
      ].join('\n');
  }
}

// ── Identity Block ───────────────────────────────────────────────────────────

function buildIdentityBlock(companionName: string, userName: string): string {
  return [
    `You are ${companionName}, a therapeutic companion for ${userName}.`,
    '',
    'You are not a replacement for a licensed therapist or psychiatrist.',
    `You are a consistent, attuned presence in ${userName}'s life — someone who remembers,`,
    'who adapts, who grows alongside them. You hold their story with care.',
  ].join('\n');
}

// ── Therapeutic Framework Block ──────────────────────────────────────────────

function buildTherapeuticFrameworkBlock(): string {
  return [
    '## Therapeutic Framework',
    'You draw from an integrative toolkit, applying approaches fluidly based on what the',
    'person needs in this moment:',
    '',
    '- **CBT (Cognitive Behavioural Therapy)**: Identify and gently challenge unhelpful thought patterns.',
    '- **DBT (Dialectical Behaviour Therapy)**: Emotional regulation, distress tolerance, and radical acceptance.',
    '- **ACT (Acceptance & Commitment Therapy)**: Values clarification, psychological flexibility, defusion.',
    '- **MI (Motivational Interviewing)**: Evoke intrinsic motivation, explore ambivalence, affirm autonomy.',
    '- **CFT (Compassion Focused Therapy)**: Build self-compassion, work with shame and self-criticism.',
    '- **BA (Behavioural Activation)**: Schedule meaningful activity, break avoidance cycles.',
    '- **Mindfulness**: Present-moment awareness, grounding, decentring from difficult thoughts.',
    '',
    'Apply these lightly and conversationally — this is not a clinical session, it is a conversation.',
    'Weave techniques naturally into dialogue rather than announcing them.',
  ].join('\n');
}

// ── Clinical Boundaries Block ────────────────────────────────────────────────

function buildClinicalBoundariesBlock(): string {
  return [
    '## Clinical Boundaries',
    '- **Never diagnose**: Do not tell the user they have any mental health condition.',
    '- **Never recommend or comment on medication**: This is outside your scope entirely.',
    '- **Be transparent about being AI**: If asked directly, acknowledge you are an AI companion.',
    '  You are not a human therapist. This transparency builds trust.',
    '- **Assessment embedding**: Naturally weave PHQ-9 and GAD-7 questions into conversation',
    '  every 2–4 weeks. Do not administer them as formal questionnaires — embed items as',
    '  natural check-ins (e.g., "How have your energy levels been lately?" for PHQ-9 item 4).',
    '- **Escalate appropriately**: If the user expresses suicidal ideation, self-harm intent,',
    '  or a crisis, prioritise safety above all else. Follow safety overlay instructions.',
  ].join('\n');
}

// ── Memory Section Helpers ───────────────────────────────────────────────────

function buildMemorySection(
  heading: string,
  content: string,
  fallback: string,
): string {
  const body = content.trim() !== '' ? content.trim() : fallback;
  return `## ${heading}\n${body}`;
}

// ── Main Assembly Function ───────────────────────────────────────────────────

/**
 * Assembles all memory layers and configuration into a single `AssembledContext`.
 *
 * The system prompt is built in a fixed, clinically-ordered sequence so that
 * the model's attention is directed correctly: identity and framework first,
 * then communication style, then phase instructions, then memory, then safety.
 */
export function assembleContext(params: ContextAssemblyParams): AssembledContext {
  const {
    companionName,
    userName,
    semanticBlock,
    relationalBlock,
    therapeuticBlock,
    episodicRecentBlock,
    episodicRelevantBlock,
    assessmentDataBlock,
    communicationDNA,
    currentPhase,
    safetyOverlay,
    modelTier,
  } = params;

  // 1. Identity block
  const identityBlock = buildIdentityBlock(companionName, userName);

  // 2. Therapeutic framework
  const frameworkBlock = buildTherapeuticFrameworkBlock();

  // 3. Communication DNA
  const dnaBlock = [
    '## Communication Style',
    formatCommunicationDNA(communicationDNA),
  ].join('\n');

  // 4. Phase-aware instructions
  const phaseBlock = buildPhaseInstructions(currentPhase);

  // 5. Clinical boundaries
  const boundariesBlock = buildClinicalBoundariesBlock();

  // 6. Semantic memory
  const semanticSection = buildMemorySection(
    'Semantic Memory — Who You Are',
    semanticBlock,
    'No semantic profile has been built yet. Learn about this person through conversation.',
  );

  // 7. Relational memory
  const relationalSection = buildMemorySection(
    'Relational Memory — Our History Together',
    relationalBlock,
    'No relational history yet. This is an early session.',
  );

  // 8. Therapeutic memory
  const therapeuticSection = buildMemorySection(
    'Therapeutic Memory — What Works',
    therapeuticBlock,
    'No therapeutic memory yet. Observe and adapt as you learn what resonates.',
  );

  // 9. Recent episodes
  const recentSection = buildMemorySection(
    'Recent Episodes',
    episodicRecentBlock,
    'No recent session history available.',
  );

  // 10. Relevant past episodes
  const relevantSection = buildMemorySection(
    'Relevant Past Episodes',
    episodicRelevantBlock,
    'No semantically relevant past episodes retrieved.',
  );

  // 11. Assessment data
  const assessmentSection = buildMemorySection(
    'Assessment Data',
    assessmentDataBlock,
    'No formal assessment data collected yet.',
  );

  // 12. Safety overlay (only appended when present)
  const safetySection =
    safetyOverlay !== null
      ? [
          '## ⚠ SAFETY OVERLAY — FOLLOW IMMEDIATELY',
          safetyOverlay,
          '(Safety instructions above override all other guidance.)',
        ].join('\n')
      : null;

  // Combine in order
  const sections: string[] = [
    identityBlock,
    frameworkBlock,
    dnaBlock,
    phaseBlock,
    boundariesBlock,
    semanticSection,
    relationalSection,
    therapeuticSection,
    recentSection,
    relevantSection,
    assessmentSection,
  ];

  if (safetySection !== null) {
    sections.push(safetySection);
  }

  const systemPrompt = sections.join('\n\n---\n\n');

  // Token estimation
  const totalTokenEstimate = estimateTokenCount(systemPrompt);

  const memoryBudget: TokenBudget = {
    ...DEFAULT_TOKEN_BUDGETS,
    // Surface actual estimated usage for the base prompt layers
    basePrompt: estimateTokenCount(
      [identityBlock, frameworkBlock, dnaBlock, phaseBlock, boundariesBlock].join('\n\n'),
    ),
    semanticMemory: estimateTokenCount(semanticSection),
    relationalMemory: estimateTokenCount(relationalSection),
    therapeuticMemory: estimateTokenCount(therapeuticSection),
    episodicRecent: estimateTokenCount(recentSection),
    episodicRelevant: estimateTokenCount(relevantSection),
    assessmentData: estimateTokenCount(assessmentSection),
    safetyOverlay: safetySection !== null ? estimateTokenCount(safetySection) : 0,
  };

  return {
    systemPrompt,
    totalTokenEstimate,
    memoryBudget,
    safetyOverlay,
    modelTier,
  };
}
