// ---------------------------------------------------------------------------
// Voice Check-In Processor
// ---------------------------------------------------------------------------
// Parses natural language voice transcripts into structured check-in data.
// Extracts mood, dimension scores, and cleans up journal text.
// ---------------------------------------------------------------------------

import { classifyDimension } from './classify';
import { detectMoodFromText } from './classify';
import { DIMENSION_LABELS, type DimensionLabel } from './models';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceCheckInResult {
  mood: number;
  dimensions: Partial<Record<DimensionLabel, number>>;
  cleanedJournal: string;
  rawTranscript: string;
}

export interface VoiceSession {
  transcript: string;
  startedAt: Date;
  endedAt?: Date;
  result?: VoiceCheckInResult;
}

// ---------------------------------------------------------------------------
// Score extraction patterns
// ---------------------------------------------------------------------------

/**
 * Matches patterns like "career is about a 7", "health: 8", "fitness 6 out of 10"
 */
const SCORE_PATTERNS = [
  // "career is about a 7" / "career is a 7"
  /\b(career|finance|health|fitness|family|social|romance|growth)\s+(?:is\s+)?(?:about\s+)?(?:a\s+)?(\d+)\b/gi,
  // "career: 7"
  /\b(career|finance|health|fitness|family|social|romance|growth)\s*:\s*(\d+)\b/gi,
  // "career 7 out of 10"
  /\b(career|finance|health|fitness|family|social|romance|growth)\s+(\d+)\s+(?:out of 10|\/10)\b/gi,
  // "I'd rate career a 7" / "I'd give career a 7"
  /\b(?:rate|give)\s+(career|finance|health|fitness|family|social|romance|growth)\s+(?:a\s+)?(\d+)\b/gi,
];

/**
 * Extract explicit dimension scores from transcript text.
 */
function extractExplicitScores(text: string): Partial<Record<DimensionLabel, number>> {
  const scores: Partial<Record<DimensionLabel, number>> = {};

  for (const pattern of SCORE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const dim = match[1].toLowerCase() as DimensionLabel;
      const score = parseInt(match[2], 10);

      // Validate dimension and score range
      if (DIMENSION_LABELS.includes(dim) && score >= 1 && score <= 10) {
        scores[dim] = score;
      }
    }
  }

  return scores;
}

/**
 * Extract an explicit mood score from text.
 * Matches patterns like "mood is 7", "feeling about a 6", "overall 8"
 */
function extractExplicitMood(text: string): number | null {
  const patterns = [
    /\b(?:mood|feeling|overall)\s+(?:is\s+)?(?:about\s+)?(?:a\s+)?(\d+)\b/i,
    /\b(?:mood|feeling|overall)\s*:\s*(\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 1 && score <= 10) return score;
    }
  }

  return null;
}

/**
 * Clean up the transcript for journal storage by removing explicit scores
 * and filler words.
 */
function cleanTranscript(text: string): string {
  let cleaned = text;

  // Remove explicit score declarations
  for (const pattern of SCORE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Remove mood score declarations
  cleaned = cleaned.replace(
    /\b(?:mood|feeling|overall)\s+(?:is\s+)?(?:about\s+)?(?:a\s+)?\d+\b/gi,
    '',
  );

  // Clean up whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  // Remove leading/trailing filler
  cleaned = cleaned
    .replace(/^(?:um|uh|so|well|okay|ok|alright)\s*,?\s*/i, '')
    .replace(/\s*(?:um|uh)\s*/gi, ' ')
    .trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

/**
 * Process a voice transcript into a structured check-in result.
 * Extracts explicit scores, estimates mood from sentiment, and cleans
 * the transcript for journal storage.
 */
export async function processVoiceCheckIn(
  transcript: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<VoiceCheckInResult> {
  if (!transcript.trim()) {
    return {
      mood: 5,
      dimensions: {},
      cleanedJournal: '',
      rawTranscript: transcript,
    };
  }

  // 1. Extract explicit dimension scores from the transcript
  const explicitScores = extractExplicitScores(transcript);

  // 2. Extract or estimate mood
  let mood = extractExplicitMood(transcript);

  if (mood === null) {
    // Fall back to sentiment-based mood detection
    const moodEstimate = await detectMoodFromText(transcript, onProgress);
    mood = moodEstimate.estimatedMood;
  }

  // 3. Use ML classifier for dimensions not explicitly mentioned
  const dimensions: Partial<Record<DimensionLabel, number>> = { ...explicitScores };

  // Only run classifier if there are unscored dimensions
  const scoredDims = new Set(Object.keys(explicitScores));
  if (scoredDims.size < DIMENSION_LABELS.length) {
    try {
      const classifiedScores = await classifyDimension(transcript, onProgress);

      // Map classifier probability scores (0-1) to 1-10 range
      for (const dim of DIMENSION_LABELS) {
        if (!scoredDims.has(dim)) {
          const probability = classifiedScores[dim as DimensionLabel] ?? 0;
          // Only include dimensions with meaningful signal (above uniform)
          if (probability > 0.15) {
            dimensions[dim as DimensionLabel] = Math.max(
              1,
              Math.min(10, Math.round(probability * 10 + mood * 0.3)),
            );
          }
        }
      }
    } catch {
      // Classifier not available -- keep only explicit scores
    }
  }

  // 4. Clean transcript for journal
  const cleanedJournal = cleanTranscript(transcript);

  return {
    mood,
    dimensions,
    cleanedJournal,
    rawTranscript: transcript,
  };
}
