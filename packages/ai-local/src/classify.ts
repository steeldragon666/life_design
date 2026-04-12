import { DIMENSION_LABELS, type DimensionLabel } from './models';
import { embed } from './embed';
import { cosineSimilarity } from './similarity';

// ── Types ──

export interface GoalClassification {
  dimensions: DimensionLabel[];
  weights: Record<string, number>;
}

export interface JournalClassification {
  dimensions: DimensionLabel[];
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
}

export interface MoodEstimate {
  estimatedMood: number;
  confidence: number;
}

// ── Dimension descriptions for semantic embedding ──

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  career: 'career: professional work, job satisfaction, career growth, workplace fulfillment',
  finance: 'finance: money management, financial security, savings, investments, budgeting',
  health: 'health: physical wellbeing, medical health, nutrition, sleep quality, mental health',
  fitness: 'fitness: exercise, physical activity, sports, workout routines, body strength',
  family: 'family: family relationships, home life, parenting, family bonds, household',
  social: 'social: friendships, social connections, community, networking, social events',
  romance: 'romance: romantic relationships, love, dating, partner connection, intimacy',
  growth: 'growth: personal development, learning, education, self-improvement, new skills',
};

// ── Lazy-cached dimension embeddings ──

let dimensionEmbeddingsCache: Map<DimensionLabel, Float32Array> | null = null;

async function getDimensionEmbeddings(
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<Map<DimensionLabel, Float32Array>> {
  if (dimensionEmbeddingsCache !== null) {
    return dimensionEmbeddingsCache;
  }

  const map = new Map<DimensionLabel, Float32Array>();
  for (const dim of DIMENSION_LABELS) {
    const description = DIMENSION_DESCRIPTIONS[dim];
    const embedding = await embed(description, onProgress);
    map.set(dim as DimensionLabel, embedding);
  }

  dimensionEmbeddingsCache = map;
  return map;
}

// ── Core classification ──

/**
 * Classify text against the 8 life dimensions using cosine similarity.
 * Returns a record mapping each dimension to its normalized score (sums to 1).
 */
export async function classifyDimension(
  text: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<Record<DimensionLabel, number>> {
  if (!text.trim()) {
    const uniform = 1 / DIMENSION_LABELS.length;
    const scores: Record<string, number> = {};
    for (const dim of DIMENSION_LABELS) {
      scores[dim] = uniform;
    }
    return scores as Record<DimensionLabel, number>;
  }

  const textEmbedding = await embed(text, onProgress);
  const dimEmbeddings = await getDimensionEmbeddings(onProgress);

  // Compute raw cosine similarities
  const rawScores: Record<string, number> = {};
  let total = 0;
  for (const dim of DIMENSION_LABELS) {
    const dimEmb = dimEmbeddings.get(dim as DimensionLabel)!;
    // Shift from [-1,1] to [0,2] to ensure non-negative before normalizing
    const sim = cosineSimilarity(textEmbedding, dimEmb) + 1;
    rawScores[dim] = sim;
    total += sim;
  }

  // Normalize so scores sum to 1
  const scores: Record<string, number> = {};
  for (const dim of DIMENSION_LABELS) {
    scores[dim] = total > 0 ? rawScores[dim] / total : 1 / DIMENSION_LABELS.length;
  }

  return scores as Record<DimensionLabel, number>;
}

// ── Goal classification ──

/**
 * Classify a goal and return relevant dimensions with confidence weights.
 * E.g. "Run a half marathon" -> { fitness: 0.8, health: 0.6, growth: 0.3 }
 */
export async function classifyGoal(
  goalText: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<GoalClassification> {
  if (!goalText.trim()) {
    return { dimensions: [], weights: {} };
  }

  const textEmbedding = await embed(goalText, onProgress);
  const dimEmbeddings = await getDimensionEmbeddings(onProgress);

  const weights: Record<string, number> = {};
  const dimensions: DimensionLabel[] = [];

  // Compute raw cosine similarities (unnormalized, for threshold comparison)
  const rawScores: Array<{ dim: DimensionLabel; score: number }> = [];
  for (const dim of DIMENSION_LABELS) {
    const dimEmb = dimEmbeddings.get(dim as DimensionLabel)!;
    const sim = cosineSimilarity(textEmbedding, dimEmb);
    rawScores.push({ dim: dim as DimensionLabel, score: sim });
  }

  // Normalize to [0,1] range using min-max normalization across dimensions
  const scores = rawScores.map((r) => r.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  for (const { dim, score } of rawScores) {
    const normalized = range > 0 ? (score - minScore) / range : 1 / DIMENSION_LABELS.length;
    if (normalized > 0.15) {
      weights[dim] = Math.round(normalized * 100) / 100;
      dimensions.push(dim);
    }
  }

  return { dimensions, weights };
}

// ── Journal classification ──

// Sentiment keyword lists
const POSITIVE_WORDS = new Set([
  'great', 'amazing', 'happy', 'love', 'excited', 'wonderful', 'fantastic',
  'awesome', 'excellent', 'good', 'glad', 'joyful', 'grateful', 'thankful',
  'blessed', 'thrilled', 'delighted', 'pleased', 'proud', 'inspired',
  'motivated', 'energized', 'confident', 'hopeful', 'optimistic', 'content',
  'satisfied', 'fulfilled', 'cheerful', 'positive', 'enjoy', 'enjoyed',
  'celebrate', 'celebrated', 'success', 'successful', 'accomplished',
  'achievement', 'progress', 'improvement', 'better', 'best', 'win', 'won',
]);

const NEGATIVE_WORDS = new Set([
  'terrible', 'awful', 'sad', 'angry', 'frustrated', 'horrible', 'dreadful',
  'miserable', 'unhappy', 'depressed', 'anxious', 'worried', 'stressed',
  'overwhelmed', 'exhausted', 'tired', 'sick', 'hurt', 'pain', 'bad',
  'disappointed', 'discouraged', 'hopeless', 'lonely', 'isolated', 'lost',
  'failed', 'failure', 'struggle', 'struggling', 'difficult', 'hard',
  'problem', 'problems', 'trouble', 'troubled', 'upset', 'angry', 'mad',
  'hate', 'dislike', 'regret', 'regretted', 'worse', 'worst', 'wrong',
]);

/**
 * Determine sentiment from text using keyword matching.
 */
function detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }

  if (positiveCount === 0 && negativeCount === 0) return 'neutral';
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Full classification of a journal entry: which dimensions it relates to,
 * overall sentiment, and extracted topic keywords.
 */
export async function classifyJournalEntry(
  text: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<JournalClassification> {
  if (!text.trim()) {
    return { dimensions: [], sentiment: 'neutral', topics: [] };
  }

  // Run dimension classification and sentiment in parallel
  const [dimScores, sentiment] = await Promise.all([
    classifyDimension(text, onProgress),
    Promise.resolve(detectSentiment(text)),
  ]);

  // Extract dimensions with normalized score above threshold
  // Since classifyDimension normalizes to sum=1, uniform is 1/8 = 0.125
  // Threshold > 0.2 picks dimensions that score above uniform
  const dimensions: DimensionLabel[] = [];
  for (const dim of DIMENSION_LABELS) {
    if ((dimScores[dim as DimensionLabel] ?? 0) > 0.2) {
      dimensions.push(dim as DimensionLabel);
    }
  }

  const topics = extractTopics(text);

  return { dimensions, sentiment, topics };
}

/**
 * Simple keyword extraction: splits text into words and picks
 * the most meaningful ones as topics. Not a full NER pipeline
 * but adequate for tagging journal entries on-device.
 */
function extractTopics(text: string): string[] {
  const stopwords = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'he', 'she',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'up', 'out',
    'so', 'no', 'not', 'but', 'and', 'or', 'if', 'then', 'that', 'this',
    'what', 'which', 'who', 'when', 'where', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
    'very', 'just', 'also', 'really', 'quite', 'still', 'even', 'much',
    'well', 'back', 'now', 'here', 'there', 'again', 'once', 'got', 'get',
    'went', 'going', 'go', 'been', 'today', 'yesterday', 'day', 'time',
    'think', 'feel', 'feeling', 'felt', 'like', 'know', 'make', 'made',
    'thing', 'things', 'way', 'lot', 'bit', 'one', 'two', 'first', 'last',
    'after', 'before', 'during', 'through', 'over', 'between', 'under',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w));

  // Deduplicate and take top 5
  const unique = [...new Set(words)];
  return unique.slice(0, 5);
}

// ── Mood detection ──

/**
 * Estimate a mood score (1-5) from journal text using keyword-based sentiment.
 * Positive words push score up from neutral 3, negative words push down.
 */
export async function detectMoodFromText(
  text: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<MoodEstimate> {
  // Suppress unused parameter warning — signature preserved for API compatibility
  void onProgress;

  if (!text.trim()) {
    return { estimatedMood: 3, confidence: 0 };
  }

  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  const totalWords = words.length;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }

  const sentimentWords = positiveCount + negativeCount;

  if (sentimentWords === 0) {
    return { estimatedMood: 3, confidence: 0 };
  }

  // Net sentiment ratio in [-1, 1]: +1 = all positive, -1 = all negative
  const netRatio = (positiveCount - negativeCount) / sentimentWords;

  // Map net ratio from [-1, 1] to [1, 5]:
  //   +1  → 5    (very positive)
  //   0   → 3    (neutral)
  //   -1  → 1    (very negative)
  const rawMood = 3 + netRatio * 2;
  const estimatedMood = Math.max(1, Math.min(5, Math.round(rawMood)));

  // Confidence = density of sentiment words in total text (capped at 1)
  const confidence = Math.round(Math.min(sentimentWords / Math.max(totalWords, 1), 1) * 100) / 100;

  return { estimatedMood, confidence };
}
