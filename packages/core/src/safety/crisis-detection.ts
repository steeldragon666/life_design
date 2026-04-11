import { CrisisLevel, type CrisisDetectionResult } from './types';

// CRITICAL: These patterns must be carefully validated.
// False negatives (missing a crisis) are far worse than false positives.
// When in doubt, flag it.

const HIGH_PATTERNS = [
  /\b(kill|end)\s+(my\s*self|myself|my\s+life)\b/i,
  /\bsuicid/i,
  /\bwant\s+to\s+die\b/i,
  /\bbetter\s+off\s+dead\b/i,
  /\bhurting\s+(my\s*self|myself)\b/i,
  /\bself[- ]?harm/i,
  /\bcut(ting)?\s+(my\s*self|myself)\b/i,
  /\btake\s+my\s+(own\s+)?life\b/i,
  /\bend\s+it\s+all\b/i,
];

const MEDIUM_PATTERNS = [
  /\bno\s+point\s+(in\s+)?(going\s+on|living|continuing)\b/i,
  /\bcan'?t\s+go\s+on\b/i,
  /\bwant\s+everything\s+to\s+stop\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+here|exist|wake\s+up)\b/i,
  /\bwish\s+I\s+(was|were)\s+(dead|gone|never\s+born)\b/i,
  /\bnobody\s+would\s+(care|miss|notice)\b/i,
  /\beveryone\s+would\s+be\s+better\s+off\s+without\s+me\b/i,
];

// Patterns that look dangerous but are common metaphorical usage
const FALSE_POSITIVE_PATTERNS = [
  /\bkilling\s+(it|the\s+game|time)\b/i,
  /\b(deadline|work|job|traffic|weather)\s+is\s+killing\b/i,
  /\bto\s+die\s+for\b/i,
  /\bdying\s+(to|of)\s+(try|see|know|laughter|curiosity)\b/i,
];

export function detectCrisisIndicators(text: string): CrisisDetectionResult {
  const normalised = text.toLowerCase().trim();
  const triggers: string[] = [];

  // Check false positives first
  for (const pattern of FALSE_POSITIVE_PATTERNS) {
    if (pattern.test(normalised)) {
      return { matched: false, level: CrisisLevel.None, triggers: [], confidence: 0.9 };
    }
  }

  // Check high-severity patterns
  for (const pattern of HIGH_PATTERNS) {
    if (pattern.test(normalised)) {
      triggers.push(pattern.source);
    }
  }
  if (triggers.length > 0) {
    return { matched: true, level: CrisisLevel.High, triggers, confidence: 0.95 };
  }

  // Check medium-severity patterns
  for (const pattern of MEDIUM_PATTERNS) {
    if (pattern.test(normalised)) {
      triggers.push(pattern.source);
    }
  }
  if (triggers.length > 0) {
    return { matched: true, level: CrisisLevel.Medium, triggers, confidence: 0.8 };
  }

  return { matched: false, level: CrisisLevel.None, triggers: [], confidence: 0.9 };
}

export { CrisisLevel };
