/**
 * Linguistic Biomarker Detection Module
 *
 * Provides both the original distortion-detection API (detectLinguisticBiomarkers)
 * and the comprehensive biomarker analysis API (analyzeLinguisticBiomarkers).
 *
 * IMPORTANT: All outputs are educational self-awareness tools,
 * never diagnostic or clinical assessments.
 */

// ---------------------------------------------------------------------------
// New comprehensive biomarker types
// ---------------------------------------------------------------------------

export interface LinguisticBiomarkers {
  /** Cognitive distortion indicators */
  cognitiveDistortions: {
    allOrNothingThinking: number; // 0-1 score based on absolute language
    catastrophizing: number; // 0-1 score based on disaster language
    personalization: number; // 0-1 score based on self-blame patterns
    overgeneralization: number; // 0-1 score based on "always/never" patterns
  };
  /** 0-100 composite distortion score */
  distortionScore: number;

  /** Emotional word tracking */
  emotionalTone: {
    positiveWordRatio: number; // positive words / total words
    negativeWordRatio: number; // negative words / total words
    emotionalIntensity: number; // 0-1, how emotionally charged the text is
  };

  /** Pronoun analysis (depression research indicator) */
  pronounRatio: {
    firstPersonSingular: number; // I, me, my, mine, myself
    firstPersonPlural: number; // we, us, our, ours, ourselves
    secondPerson: number; // you, your, yours, yourself, yourselves
    thirdPerson: number; // he, she, they, them, his, her, their, him, etc.
  };

  /** Text complexity */
  syntacticComplexity: {
    averageSentenceLength: number; // words per sentence
    vocabularyRichness: number; // unique words / total words (type-token ratio)
    averageWordLength: number; // characters per word
  };

  /** Summary concern level */
  overallConcernLevel: 'none' | 'mild' | 'moderate' | 'elevated';
}

// ---------------------------------------------------------------------------
// Original types (preserved for backward compatibility)
// ---------------------------------------------------------------------------

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

const MIND_READING_PATTERNS = [
  /\b(they think|she thinks|he thinks|everyone thinks|people think)\b/gi,
  /\b(they must think|she must think|he must think)\b/gi,
];

const FORTUNE_TELLING_PATTERNS = [
  /\b(it will never|will never work|going to fail|won't ever|it'll go wrong|I know it will)\b/gi,
  /\b(there's no point|no use trying)\b/gi,
];

const PATTERN_GROUPS: PatternGroup[] = [
  { type: 'all_or_nothing', patterns: ALL_OR_NOTHING_PATTERNS, confidence: 0.7 },
  { type: 'catastrophising', patterns: CATASTROPHISING_PATTERNS, confidence: 0.75 },
  { type: 'personalisation', patterns: PERSONALISATION_PATTERNS, confidence: 0.8 },
  { type: 'mind_reading', patterns: MIND_READING_PATTERNS, confidence: 0.65 },
  { type: 'fortune_telling', patterns: FORTUNE_TELLING_PATTERNS, confidence: 0.65 },
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
    distortionCount >= 4 ||
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

// ---------------------------------------------------------------------------
// New comprehensive biomarker API
// ---------------------------------------------------------------------------

// Word lists for the new API
const NEW_ALL_OR_NOTHING_WORDS = [
  'always', 'never', 'nothing', 'everything', 'totally',
  'completely', 'worst', 'best', 'perfect', 'ruined',
];

const NEW_CATASTROPHIZING_WORDS = [
  'terrible', 'awful', 'disaster', 'horrible', 'unbearable', 'worst',
];

const NEW_CATASTROPHIZING_PHRASES = [
  "can't handle", 'cannot handle', 'the end', 'worst thing',
];

const NEW_PERSONALIZATION_PHRASES = [
  'my fault', 'i caused', 'because of me',
  "i'm to blame", 'i am to blame', 'i should have',
];

const NEW_OVERGENERALIZATION_WORDS = ['always', 'never', 'everyone', 'nobody'];
const NEW_OVERGENERALIZATION_PHRASES = ['no one', 'every time'];

const NEW_POSITIVE_WORDS = [
  'happy', 'great', 'good', 'love', 'enjoy', 'excited', 'grateful',
  'proud', 'amazing', 'wonderful', 'peaceful', 'accomplished',
  'motivated', 'inspired', 'confident', 'optimistic', 'joyful',
  'satisfied', 'content', 'hopeful', 'cheerful', 'delighted',
  'thrilled', 'blessed', 'thankful', 'pleasant', 'fantastic',
  'excellent', 'awesome', 'beautiful',
];

const NEW_NEGATIVE_WORDS = [
  'sad', 'angry', 'frustrated', 'anxious', 'stressed', 'worried',
  'tired', 'overwhelmed', 'disappointed', 'lonely', 'afraid',
  'hopeless', 'exhausted', 'difficult', 'struggle', 'upset',
  'lost', 'stuck', 'depressed', 'miserable', 'furious',
  'terrified', 'helpless', 'worthless', 'ashamed', 'guilty',
  'resentful', 'bitter', 'defeated', 'broken',
];

const FPS_PRONOUNS = ['i', 'me', 'my', 'mine', 'myself'];
const FPP_PRONOUNS = ['we', 'us', 'our', 'ours', 'ourselves'];
const SP_PRONOUNS = ['you', 'your', 'yours', 'yourself', 'yourselves'];
const TP_PRONOUNS = [
  'he', 'him', 'his', 'she', 'her', 'hers', 'herself', 'himself',
  'they', 'them', 'their', 'theirs', 'themselves', 'it', 'its', 'itself',
];

// ---------------------------------------------------------------------------
// Utility helpers for new API
// ---------------------------------------------------------------------------

function tokenizeNew(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z']/g, ''))
    .filter((w) => w.length > 0);
}

function splitSentencesNew(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countPhraseMatchesNew(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of phrases) {
    let idx = 0;
    while ((idx = lower.indexOf(phrase, idx)) !== -1) {
      count++;
      idx += phrase.length;
    }
  }
  return count;
}

function countWordMatchesNew(words: string[], targets: string[]): number {
  let count = 0;
  for (const word of words) {
    if (targets.includes(word)) count++;
  }
  return count;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

// ---------------------------------------------------------------------------
// New public functions
// ---------------------------------------------------------------------------

/**
 * Full linguistic biomarker analysis.
 * Returns null for text under 20 words (too short for meaningful analysis).
 */
export function analyzeLinguisticBiomarkers(
  text: string,
): LinguisticBiomarkers | null {
  const words = tokenizeNew(text);
  if (words.length < 20) return null;

  const cognitiveDistortions = detectCognitiveDistortions(text);
  const emotionalTone = analyzeEmotionalTone(text);
  const pronounRatio = analyzePronounUsage(text);
  const syntacticComplexity = analyzeSyntacticComplexity(text);

  const distortionScore = computeDistortionScore(cognitiveDistortions);
  const overallConcernLevel = computeConcernLevel(distortionScore, emotionalTone);

  return {
    cognitiveDistortions,
    distortionScore,
    emotionalTone,
    pronounRatio,
    syntacticComplexity,
    overallConcernLevel,
  };
}

/**
 * Detect cognitive distortion patterns in text.
 * Each score is 0-1 based on density of matching patterns.
 */
export function detectCognitiveDistortions(
  text: string,
): LinguisticBiomarkers['cognitiveDistortions'] {
  const words = tokenizeNew(text);
  const wordCount = Math.max(words.length, 1);

  const aonCount = countWordMatchesNew(words, NEW_ALL_OR_NOTHING_WORDS);
  const allOrNothingThinking = clamp01((aonCount / wordCount) * 5);

  const catWordCount = countWordMatchesNew(words, NEW_CATASTROPHIZING_WORDS);
  const catPhraseCount = countPhraseMatchesNew(text, NEW_CATASTROPHIZING_PHRASES);
  const catastrophizing = clamp01(((catWordCount + catPhraseCount) / wordCount) * 5);

  const persCount = countPhraseMatchesNew(text, NEW_PERSONALIZATION_PHRASES);
  const personalization = clamp01((persCount / wordCount) * 10);

  const ogWordCount = countWordMatchesNew(words, NEW_OVERGENERALIZATION_WORDS);
  const ogPhraseCount = countPhraseMatchesNew(text, NEW_OVERGENERALIZATION_PHRASES);
  const overgeneralization = clamp01(((ogWordCount + ogPhraseCount) / wordCount) * 5);

  return {
    allOrNothingThinking,
    catastrophizing,
    personalization,
    overgeneralization,
  };
}

/**
 * Analyze emotional tone using curated positive/negative word lists.
 */
export function analyzeEmotionalTone(
  text: string,
): LinguisticBiomarkers['emotionalTone'] {
  const words = tokenizeNew(text);
  const wordCount = Math.max(words.length, 1);

  const positiveCount = countWordMatchesNew(words, NEW_POSITIVE_WORDS);
  const negativeCount = countWordMatchesNew(words, NEW_NEGATIVE_WORDS);

  const positiveWordRatio = positiveCount / wordCount;
  const negativeWordRatio = negativeCount / wordCount;
  const emotionalIntensity = clamp01((positiveCount + negativeCount) / wordCount);

  return { positiveWordRatio, negativeWordRatio, emotionalIntensity };
}

/**
 * Analyze pronoun usage patterns.
 * Returns each pronoun category as a ratio of total words.
 */
export function analyzePronounUsage(
  text: string,
): LinguisticBiomarkers['pronounRatio'] {
  const words = tokenizeNew(text);
  const wordCount = Math.max(words.length, 1);

  return {
    firstPersonSingular: countWordMatchesNew(words, FPS_PRONOUNS) / wordCount,
    firstPersonPlural: countWordMatchesNew(words, FPP_PRONOUNS) / wordCount,
    secondPerson: countWordMatchesNew(words, SP_PRONOUNS) / wordCount,
    thirdPerson: countWordMatchesNew(words, TP_PRONOUNS) / wordCount,
  };
}

/**
 * Analyze syntactic complexity of text.
 */
export function analyzeSyntacticComplexity(
  text: string,
): LinguisticBiomarkers['syntacticComplexity'] {
  const words = tokenizeNew(text);
  const sentences = splitSentencesNew(text);
  const wordCount = Math.max(words.length, 1);
  const sentenceCount = Math.max(sentences.length, 1);

  const averageSentenceLength = wordCount / sentenceCount;
  const uniqueWords = new Set(words);
  const vocabularyRichness = uniqueWords.size / wordCount;
  const totalCharacters = words.reduce((sum, w) => sum + w.length, 0);
  const averageWordLength = totalCharacters / wordCount;

  return { averageSentenceLength, vocabularyRichness, averageWordLength };
}

/**
 * Generate an educational insight from biomarker analysis.
 *
 * IMPORTANT: All language is educational, never diagnostic.
 * These are self-awareness tools, not assessments.
 */
export function generateBiomarkerInsight(
  biomarkers: LinguisticBiomarkers,
): string {
  const { cognitiveDistortions, overallConcernLevel, emotionalTone } = biomarkers;

  if (overallConcernLevel === 'none') {
    return 'Your writing today shows a balanced perspective. Journaling regularly can help maintain self-awareness and emotional clarity.';
  }

  const patterns: string[] = [];

  if (cognitiveDistortions.allOrNothingThinking > 0.3) {
    patterns.push(
      'all-or-nothing language patterns (words like "always", "never", "everything")',
    );
  }
  if (cognitiveDistortions.catastrophizing > 0.3) {
    patterns.push(
      'catastrophizing language (words suggesting worst-case scenarios)',
    );
  }
  if (cognitiveDistortions.personalization > 0.3) {
    patterns.push(
      'self-blame language patterns (phrases taking personal responsibility for external events)',
    );
  }
  if (cognitiveDistortions.overgeneralization > 0.3) {
    patterns.push(
      'overgeneralization patterns (sweeping statements about how things "always" or "never" happen)',
    );
  }

  if (patterns.length === 0) {
    if (emotionalTone.negativeWordRatio > emotionalTone.positiveWordRatio) {
      return 'Your writing today leans toward negative emotional language. This is worth noticing as a self-awareness exercise. CBT research suggests that simply observing our language patterns can be a helpful first step in understanding our thinking habits.';
    }
    return 'Your writing today contains some patterns worth reflecting on. Awareness of how we express ourselves in writing can be a valuable self-awareness practice.';
  }

  const patternList = patterns.join('; ');

  if (overallConcernLevel === 'elevated') {
    return `Your writing today shows several notable patterns: ${patternList}. This is common and worth noticing. CBT research suggests that awareness of these patterns is the first step toward more flexible thinking. Consider reflecting on whether these patterns feel accurate to your experience.`;
  }

  return `Your writing today shows some ${patterns[0]}. This is common and worth noticing \u2014 CBT research suggests awareness of these patterns is the first step. Consider reflecting on whether alternative perspectives might also be valid.`;
}

// ---------------------------------------------------------------------------
// Internal scoring helpers
// ---------------------------------------------------------------------------

function computeDistortionScore(
  distortions: LinguisticBiomarkers['cognitiveDistortions'],
): number {
  const avg =
    (distortions.allOrNothingThinking +
      distortions.catastrophizing +
      distortions.personalization +
      distortions.overgeneralization) /
    4;
  return Math.round(clamp01(avg) * 100);
}

function computeConcernLevel(
  distortionScore: number,
  emotionalTone: LinguisticBiomarkers['emotionalTone'],
): LinguisticBiomarkers['overallConcernLevel'] {
  const negativeSignal = emotionalTone.negativeWordRatio > 0.1 ? 10 : 0;
  const combinedScore = distortionScore + negativeSignal;

  if (combinedScore >= 40) return 'elevated';
  if (combinedScore >= 20) return 'moderate';
  if (combinedScore >= 10) return 'mild';
  return 'none';
}
