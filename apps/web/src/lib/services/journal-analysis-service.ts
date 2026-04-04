import { DIMENSION_LABELS, type Dimension } from '@life-design/core';

interface JournalAnalysis {
  sentiment: number; // -1.0 to 1.0
  themes: string[];
  dimensions: Dimension[];
}

const DIMENSION_KEYWORDS: Record<Dimension, string[]> = {
  career: ['work', 'job', 'career', 'boss', 'office', 'meeting', 'project', 'deadline', 'promotion', 'colleague'],
  finance: ['money', 'budget', 'save', 'spend', 'invest', 'salary', 'debt', 'bill', 'financial', 'expense'],
  health: ['health', 'sleep', 'diet', 'doctor', 'sick', 'medicine', 'pain', 'rest', 'energy', 'tired'],
  fitness: ['exercise', 'gym', 'run', 'workout', 'walk', 'swim', 'yoga', 'stretch', 'weight', 'active'],
  family: ['family', 'parent', 'child', 'sibling', 'home', 'kids', 'mom', 'dad', 'brother', 'sister'],
  social: ['friend', 'social', 'party', 'group', 'community', 'people', 'hangout', 'event', 'chat', 'together'],
  romance: ['partner', 'relationship', 'love', 'date', 'romantic', 'spouse', 'husband', 'wife', 'intimacy', 'couple'],
  growth: ['learn', 'read', 'book', 'course', 'grow', 'skill', 'study', 'practice', 'improve', 'develop'],
};

const POSITIVE_WORDS = ['happy', 'great', 'good', 'love', 'enjoy', 'excited', 'grateful', 'proud', 'amazing', 'wonderful', 'peaceful', 'accomplished', 'motivated', 'inspired', 'confident', 'optimistic', 'joyful', 'satisfied'];
const NEGATIVE_WORDS = ['sad', 'angry', 'frustrated', 'anxious', 'stressed', 'worried', 'tired', 'overwhelmed', 'disappointed', 'lonely', 'afraid', 'hopeless', 'exhausted', 'difficult', 'struggle', 'upset', 'lost', 'stuck'];

/**
 * Lightweight client-side journal analysis.
 * Uses keyword matching for dimension detection and basic sentiment.
 * For richer analysis, use the Gemini-backed server version.
 */
export function analyzeJournalEntryLocal(text: string): JournalAnalysis {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  // Sentiment: simple positive/negative word ratio
  let positiveCount = 0;
  let negativeCount = 0;
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (POSITIVE_WORDS.includes(clean)) positiveCount++;
    if (NEGATIVE_WORDS.includes(clean)) negativeCount++;
  }
  const total = positiveCount + negativeCount;
  const sentiment = total > 0 ? (positiveCount - negativeCount) / total : 0;

  // Dimension detection: keyword matching
  const dimensions: Dimension[] = [];
  for (const [dim, keywords] of Object.entries(DIMENSION_KEYWORDS) as [Dimension, string[]][]) {
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
    if (matches >= 2 || (matches >= 1 && words.length < 50)) {
      dimensions.push(dim);
    }
  }

  // Theme extraction: top mentioned dimension labels
  const themes = dimensions.map((d) => DIMENSION_LABELS[d]);

  return { sentiment, themes, dimensions };
}

/**
 * Server-side journal analysis using Gemini 1.5 Flash.
 * Returns structured sentiment, themes, and dimension tags.
 */
export async function analyzeJournalEntryAI(text: string): Promise<JournalAnalysis> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return analyzeJournalEntryLocal(text);
  }

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this journal entry. Return ONLY valid JSON with no markdown formatting:
{
  "sentiment": <number from -1.0 to 1.0>,
  "themes": [<up to 3 short theme strings>],
  "dimensions": [<matching dimensions from: career, finance, health, fitness, family, social, romance, growth>]
}

Journal entry: "${text.slice(0, 500)}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return analyzeJournalEntryLocal(text);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      sentiment: Math.max(-1, Math.min(1, Number(parsed.sentiment) || 0)),
      themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 5) : [],
      dimensions: Array.isArray(parsed.dimensions)
        ? parsed.dimensions.filter((d: string) => d in DIMENSION_KEYWORDS)
        : [],
    };
  } catch (error) {
    console.error('AI journal analysis failed, falling back to local:', error);
    return analyzeJournalEntryLocal(text);
  }
}
