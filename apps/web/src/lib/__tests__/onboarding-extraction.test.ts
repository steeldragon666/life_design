import { describe, expect, it } from 'vitest';
import {
  extractProfileDeterministically,
  parseExtractedProfileFromText,
} from '@/lib/onboarding-extraction';

describe('onboarding-extraction', () => {
  it('parses JSON wrapped in markdown fences', () => {
    const input = [
      'Great reflection.',
      '```json',
      '{"name":"Aaron","location":"Sydney","interests":["fitness","meditation"]}',
      '```',
    ].join('\n');

    const result = parseExtractedProfileFromText(input);
    expect(result?.name).toBe('Aaron');
    expect(result?.location).toBe('Sydney');
    expect(result?.interests).toEqual(['fitness', 'meditation']);
  });

  it('returns null when payload has no JSON object', () => {
    const result = parseExtractedProfileFromText('I could not extract any structured data.');
    expect(result).toBeNull();
  });

  it('deterministically extracts core profile facts from user conversation', () => {
    const conversation = [
      { role: 'assistant' as const, content: 'Tell me about yourself.' },
      {
        role: 'user' as const,
        content:
          "Hi, my name is Aaron. I live in Melbourne. I'm a product designer. I enjoy surfing, reading and meditation. I'm married. My goal is to run a marathon this year.",
      },
    ];

    const result = extractProfileDeterministically(conversation);
    expect(result.name).toBe('Aaron');
    expect(result.location).toBe('Melbourne');
    expect(result.profession).toBe('product designer');
    expect(result.maritalStatus).toBe('married');
    expect(result.interests).toContain('surfing');
    expect(result.goals?.[0]?.title.toLowerCase()).toContain('run a marathon');
  });
});
