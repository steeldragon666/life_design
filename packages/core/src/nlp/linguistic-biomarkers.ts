export interface CognitiveDistortion {
  type:
    | 'all_or_nothing'
    | 'catastrophising'
    | 'personalisation'
    | 'mind_reading'
    | 'fortune_telling';
  trigger: string;
  position: number;
  confidence: number;
}

export interface BiomarkerResult {
  distortions: CognitiveDistortion[];
  sentimentIndicators: {
    negativeWordCount: number;
    positiveWordCount: number;
    firstPersonSingularCount: number;
    absoluteTermCount: number;
  };
  overallRisk: 'low' | 'moderate' | 'elevated';
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

const ALL_OR_NOTHING_PATTERNS = [
  /\b(always|never|every\s*time|nothing|everything|completely|totally|absolutely)\b/gi,
];

const CATASTROPHISING_PATTERNS = [
  /\b(worst|terrible|horrible|ruined|disaster|catastrophe|unbearable|can't\s*stand)\b/gi,
];

const PERSONALISATION_PATTERNS = [
  /\b(my\s*fault|because\s*of\s*me|I\s*caused|blame\s*myself|it's\s*on\s*me)\b/gi,
];

const NEGATIVE_WORDS =
  /\b(sad|hopeless|worthless|useless|helpless|anxious|worried|scared|angry|frustrated|exhausted|overwhelmed|empty|numb|guilty|ashamed)\b/gi;

const POSITIVE_WORDS =
  /\b(happy|grateful|proud|excited|peaceful|content|hopeful|motivated|energised|confident|loved|accomplished|calm|relaxed|inspired)\b/gi;

const FIRST_PERSON_SINGULAR = /\b(I|me|my|myself|mine)\b/g;

const ABSOLUTE_TERMS =
  /\b(always|never|every\s*time|nothing|everything|completely|totally|absolutely)\b/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PatternGroup {
  type: CognitiveDistortion['type'];
  patterns: RegExp[];
  confidence: number;
}

const PATTERN_GROUPS: PatternGroup[] = [
  { type: 'all_or_nothing', patterns: ALL_OR_NOTHING_PATTERNS, confidence: 0.7 },
  { type: 'catastrophising', patterns: CATASTROPHISING_PATTERNS, confidence: 0.75 },
  { type: 'personalisation', patterns: PERSONALISATION_PATTERNS, confidence: 0.8 },
];

function countMatches(text: string, pattern: RegExp): number {
  const re = new RegExp(pattern.source, pattern.flags);
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function detectLinguisticBiomarkers(text: string): BiomarkerResult {
  const distortions: CognitiveDistortion[] = [];

  // Detect cognitive distortions
  for (const group of PATTERN_GROUPS) {
    for (const pattern of group.patterns) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        distortions.push({
          type: group.type,
          trigger: match[0],
          position: match.index,
          confidence: group.confidence,
        });
      }
    }
  }

  // Count sentiment indicators
  const negativeWordCount = countMatches(text, NEGATIVE_WORDS);
  const positiveWordCount = countMatches(text, POSITIVE_WORDS);
  const firstPersonSingularCount = countMatches(text, FIRST_PERSON_SINGULAR);
  const absoluteTermCount = countMatches(text, ABSOLUTE_TERMS);

  // Compute overall risk
  let overallRisk: BiomarkerResult['overallRisk'] = 'low';
  const distortionCount = distortions.length;

  if (
    distortionCount >= 3 ||
    (negativeWordCount > 0 && negativeWordCount >= positiveWordCount + 3)
  ) {
    overallRisk = 'elevated';
  } else if (distortionCount >= 1) {
    overallRisk = 'moderate';
  }

  return {
    distortions,
    sentimentIndicators: {
      negativeWordCount,
      positiveWordCount,
      firstPersonSingularCount,
      absoluteTermCount,
    },
    overallRisk,
  };
}
