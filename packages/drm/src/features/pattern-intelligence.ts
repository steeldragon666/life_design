/**
 * @module features/pattern-intelligence
 *
 * Proactive pattern detection — identifies cyclical patterns, avoidance patterns,
 * trigger chains, and growth trajectories from longitudinal session data.
 *
 * All functions are pure with no side effects.
 */

import type {
  PatternIntelligence,
  CyclicalPattern,
  TriggerChain,
  AvoidancePattern,
  GrowthTrajectory,
  EpisodicMemory,
} from '../types';

// ── Periodicity Constants ─────────────────────────────────────────────────────

const PERIODICITY_RANGES: ReadonlyArray<{
  label: CyclicalPattern['periodicity'];
  minDays: number;
  maxDays: number;
}> = [
  { label: 'weekly', minDays: 5, maxDays: 9 },
  { label: 'monthly', minDays: 25, maxDays: 35 },
  { label: 'seasonal', minDays: 80, maxDays: 100 },
];

const MIN_OCCURRENCES_FOR_PATTERN = 3;

// ── Prompt ───────────────────────────────────────────────────────────────────

export const PATTERN_ANALYSIS_PROMPT: string = `You are a specialist in longitudinal psychological pattern recognition working within a therapeutic AI system.

You will be given:
- Summaries of the person's recent and historical sessions (episodic memories)
- A semantic profile capturing who they are, their traits, and their therapeutic history
- A summary of their therapeutic memory: what interventions have worked, what they avoid, what their timing patterns look like

Your task is to identify patterns that the person may not be consciously aware of. These patterns should be surfaced to help them — not to pathologise or label.

Detect any of the following pattern types:
1. Cyclical patterns — recurring emotional or behavioural themes at roughly regular intervals
2. Trigger–response chains — consistent sequences of event → emotion → behaviour
3. Avoidance patterns — topics mentioned but consistently not explored
4. Growth trajectories — positive change patterns with clear evidence

Guidelines:
- Only report patterns with meaningful evidence (at least 2–3 data points)
- Phrase everything descriptively and with compassion
- Assign a confidence score (0.0–1.0) to cyclical patterns and trigger chains

Return your response as valid JSON matching this exact shape:
{
  "cyclicalPatterns": [
    {
      "description": "string",
      "periodicity": "string — e.g. 'weekly', 'monthly', 'around major deadlines'",
      "confidence": number,
      "lastOccurrence": "ISO 8601 date string or null"
    }
  ],
  "triggerResponseChains": [
    {
      "trigger": "string",
      "response": "string",
      "frequency": number,
      "confidence": number
    }
  ],
  "avoidancePatterns": [
    {
      "topic": "string",
      "mentionCount": number,
      "exploredCount": number,
      "lastMentioned": "ISO 8601 date string or null"
    }
  ],
  "growthTrajectories": [
    {
      "description": "string",
      "startDate": "ISO 8601 date string",
      "evidence": "string — 1–2 sentences citing session data"
    }
  ]
}

Return only the JSON object. No preamble, no markdown fences.`;

// ── Context Builder ──────────────────────────────────────────────────────────

export function buildPatternAnalysisContext(params: {
  episodicSummaries: string[];
  semanticProfile: string;
  therapeuticSummary: string;
}): string {
  const { episodicSummaries, semanticProfile, therapeuticSummary } = params;

  const episodicSection =
    episodicSummaries.length > 0
      ? [
          '## Session Memory Summaries (chronological)',
          ...episodicSummaries.map((s, i) => `[${i + 1}] ${s}`),
        ]
      : ['## Session Memory Summaries', 'No session memories available.'];

  return [
    '## Semantic Profile',
    semanticProfile,
    '',
    ...episodicSection,
    '',
    '## Therapeutic Memory Summary',
    therapeuticSummary,
  ].join('\n');
}

// ── Response Parser ──────────────────────────────────────────────────────────

interface RawPatternResponse {
  cyclicalPatterns: Array<{
    description: unknown;
    periodicity: unknown;
    confidence: unknown;
    lastOccurrence: unknown;
  }>;
  triggerResponseChains: Array<{
    trigger: unknown;
    response: unknown;
    frequency: unknown;
    confidence: unknown;
  }>;
  avoidancePatterns: Array<{
    topic: unknown;
    mentionCount: unknown;
    exploredCount: unknown;
    lastMentioned: unknown;
  }>;
  growthTrajectories: Array<{
    description: unknown;
    startDate: unknown;
    evidence: unknown;
  }>;
}

function isRawPatternResponse(value: unknown): value is RawPatternResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj['cyclicalPatterns']) &&
    Array.isArray(obj['triggerResponseChains']) &&
    Array.isArray(obj['avoidancePatterns']) &&
    Array.isArray(obj['growthTrajectories'])
  );
}

function parseDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(value: unknown, fallback: number = 0): number {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

export function parsePatternResponse(
  response: string,
  userId: string,
): PatternIntelligence | null {
  try {
    const trimmed = response.trim();
    const jsonText = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      : trimmed;

    const parsed: unknown = JSON.parse(jsonText);
    if (!isRawPatternResponse(parsed)) return null;

    const cyclicalPatterns: CyclicalPattern[] = parsed.cyclicalPatterns
      .filter((p) => typeof p.description === 'string' && typeof p.periodicity === 'string')
      .map((p) => ({
        description: p.description as string,
        periodicity: p.periodicity as string,
        confidence: Math.min(1, Math.max(0, parseNumber(p.confidence, 0.5))),
        lastOccurrence: parseDateOrNull(p.lastOccurrence),
      }));

    const triggerResponseChains: TriggerChain[] = parsed.triggerResponseChains
      .filter((t) => typeof t.trigger === 'string' && typeof t.response === 'string')
      .map((t) => ({
        trigger: t.trigger as string,
        response: t.response as string,
        frequency: Math.max(0, parseNumber(t.frequency, 1)),
        confidence: Math.min(1, Math.max(0, parseNumber(t.confidence, 0.5))),
      }));

    const avoidancePatterns: AvoidancePattern[] = parsed.avoidancePatterns
      .filter((a) => typeof a.topic === 'string')
      .map((a) => ({
        topic: a.topic as string,
        mentionCount: Math.max(0, parseNumber(a.mentionCount, 0)),
        exploredCount: Math.max(0, parseNumber(a.exploredCount, 0)),
        lastMentioned: parseDateOrNull(a.lastMentioned),
      }));

    const growthTrajectories: GrowthTrajectory[] = parsed.growthTrajectories
      .filter(
        (g) =>
          typeof g.description === 'string' &&
          typeof g.startDate === 'string' &&
          typeof g.evidence === 'string',
      )
      .map((g) => {
        const startDate = new Date(g.startDate as string);
        return {
          description: g.description as string,
          startDate: isNaN(startDate.getTime()) ? new Date() : startDate,
          evidence: g.evidence as string,
        };
      });

    return {
      userId,
      cyclicalPatterns,
      triggerResponseChains,
      avoidancePatterns,
      growthTrajectories,
      detectedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// ── Pure Detection Functions ──────────────────────────────────────────────────

/**
 * Groups episodes by shared topics and checks for repeating intervals.
 * Requires at least 3 occurrences with consistent inter-occurrence spacing.
 */
export function detectCyclicalPatterns(episodicMemories: EpisodicMemory[]): CyclicalPattern[] {
  if (episodicMemories.length < MIN_OCCURRENCES_FOR_PATTERN) return [];

  // Build a map of topic → sorted timestamps
  const topicTimestamps = new Map<string, Date[]>();

  for (const memory of episodicMemories) {
    for (const topic of memory.topics) {
      const normalised = topic.toLowerCase().trim();
      if (!topicTimestamps.has(normalised)) {
        topicTimestamps.set(normalised, []);
      }
      topicTimestamps.get(normalised)!.push(memory.timestamp);
    }
  }

  const patterns: CyclicalPattern[] = [];

  for (const [topic, timestamps] of topicTimestamps) {
    if (timestamps.length < MIN_OCCURRENCES_FOR_PATTERN) continue;

    // Sort ascending
    const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());

    // Compute gaps between consecutive occurrences in days
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diffMs = sorted[i].getTime() - sorted[i - 1].getTime();
      gaps.push(diffMs / (24 * 60 * 60 * 1000));
    }

    for (const range of PERIODICITY_RANGES) {
      const inRange = gaps.filter((g) => g >= range.minDays && g <= range.maxDays);
      if (inRange.length < MIN_OCCURRENCES_FOR_PATTERN - 1) continue;

      // Confidence = proportion of gaps that fall within the range
      const confidence = inRange.length / gaps.length;

      patterns.push({
        description: `Topic "${topic}" recurs ${range.label}`,
        periodicity: range.label,
        confidence: Math.round(confidence * 100) / 100,
        lastOccurrence: sorted[sorted.length - 1] ?? null,
      });

      break; // Assign the first matching periodicity range
    }
  }

  return patterns;
}

/**
 * Identifies topics that have been mentioned across sessions but rarely
 * explored in depth. A topic is considered avoided when its mention count
 * significantly exceeds its explored count.
 */
export function detectAvoidancePatterns(
  episodicMemories: EpisodicMemory[],
  semanticTopicsApproached: string[],
): AvoidancePattern[] {
  // Count how often each topic appears across sessions
  const mentionCounts = new Map<string, { count: number; lastSeen: Date | null }>();

  for (const memory of episodicMemories) {
    for (const topic of memory.topics) {
      const normalised = topic.toLowerCase().trim();
      const existing = mentionCounts.get(normalised) ?? { count: 0, lastSeen: null };
      mentionCounts.set(normalised, {
        count: existing.count + 1,
        lastSeen:
          existing.lastSeen === null || memory.timestamp > existing.lastSeen
            ? memory.timestamp
            : existing.lastSeen,
      });
    }
  }

  // Build a set of topics that have been explored (per semantic memory)
  const exploredSet = new Set(semanticTopicsApproached.map((t) => t.toLowerCase().trim()));

  const patterns: AvoidancePattern[] = [];

  for (const [topic, { count, lastSeen }] of mentionCounts) {
    const exploredCount = exploredSet.has(topic) ? 1 : 0;

    // Avoidance signal: mentioned at least twice and never properly explored
    // OR mentioned significantly more often than explored
    const isAvoided = count >= 2 && exploredCount === 0;
    const isUnderExplored = count >= 4 && exploredCount < Math.floor(count / 3);

    if (isAvoided || isUnderExplored) {
      patterns.push({
        topic,
        mentionCount: count,
        exploredCount,
        lastMentioned: lastSeen,
      });
    }
  }

  // Sort by strongest avoidance signal first
  return patterns.sort((a, b) => b.mentionCount - a.mentionCount);
}

// ── Insight Formatter ────────────────────────────────────────────────────────

/**
 * Formats a single detected pattern as a warm, human-readable sentence
 * suitable for the companion to share with the user.
 */
export function formatPatternInsight(
  pattern: CyclicalPattern | TriggerChain | AvoidancePattern | GrowthTrajectory,
): string {
  // Discriminate by shape using property presence
  if ('periodicity' in pattern) {
    // CyclicalPattern
    const last = pattern.lastOccurrence
      ? ` (most recently ${pattern.lastOccurrence.toLocaleDateString()})`
      : '';
    return `I've noticed something that seems to come up ${pattern.periodicity}: ${pattern.description}${last}. Does that resonate with you?`;
  }

  if ('trigger' in pattern && 'response' in pattern && 'frequency' in pattern) {
    // TriggerChain
    return `There seems to be a pattern where ${pattern.trigger} tends to lead to ${pattern.response}. I've noticed this come up ${pattern.frequency} time${pattern.frequency !== 1 ? 's' : ''}. It might be worth exploring together.`;
  }

  if ('mentionCount' in pattern && 'exploredCount' in pattern) {
    // AvoidancePattern
    const last = pattern.lastMentioned
      ? ` You last brought it up ${pattern.lastMentioned.toLocaleDateString()}.`
      : '';
    return `You've touched on "${pattern.topic}" a number of times, but we haven't spent much time with it.${last} When you're ready, I'd love to go deeper there.`;
  }

  // GrowthTrajectory
  return `Something meaningful is shifting: ${pattern.description}. ${pattern.evidence}`;
}
