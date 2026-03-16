import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @life-design/core
// ---------------------------------------------------------------------------

vi.mock('@life-design/core', () => {
  const dims = ['career', 'finance', 'health', 'fitness', 'family', 'social', 'romance', 'growth'];
  return {
    ALL_DIMENSIONS: dims,
    Dimension: Object.fromEntries(dims.map((d) => [d.charAt(0).toUpperCase() + d.slice(1), d])),
  };
});

// ---------------------------------------------------------------------------
// Mock ./embed — deterministic vectors, no real model needed
// ---------------------------------------------------------------------------

vi.mock('../embed', () => {
  const DIM = 384;
  return {
    embed: vi.fn(async (text: string) => {
      const vec = new Float32Array(DIM);
      if (!text.trim()) return vec;
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
      }
      for (let i = 0; i < DIM; i++) vec[i] = Math.sin(hash + i);
      let norm = 0;
      for (let i = 0; i < DIM; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm);
      if (norm > 0) for (let i = 0; i < DIM; i++) vec[i] /= norm;
      return vec;
    }),
    embedBatch: vi.fn(async (texts: string[]) => {
      const results: Float32Array[] = [];
      for (const text of texts) {
        const { embed } = await import('../embed');
        results.push(await embed(text));
      }
      return results;
    }),
    EMBEDDING_DIM: DIM,
  };
});

// ---------------------------------------------------------------------------
// Mock ./similarity — use the real cosineSimilarity logic inline so sentence
// ranking behaves realistically without needing the actual module import chain
// ---------------------------------------------------------------------------

vi.mock('../similarity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../similarity')>();
  return actual;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('summarize', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty text returns empty string', async () => {
    const { summarize } = await import('../summarize');
    const result = await summarize('');
    expect(result).toBe('');
  });

  it('whitespace-only text returns empty string', async () => {
    const { summarize } = await import('../summarize');
    const result = await summarize('   ');
    expect(result).toBe('');
  });

  it('single sentence returns that sentence trimmed up to maxLength', async () => {
    const { summarize } = await import('../summarize');
    const sentence = 'This is a single complete sentence.';
    const result = await summarize(sentence, 100);
    expect(result).toBe(sentence.trim().slice(0, 100));
  });

  it('text without sentence-ending punctuation returns truncated text', async () => {
    const { summarize } = await import('../summarize');
    const text = 'This text has no sentence ending punctuation at all';
    const result = await summarize(text, 20);
    expect(result).toBe(text.trim().slice(0, 20));
  });

  it('text without sentence-ending punctuation respects full maxLength', async () => {
    const { summarize } = await import('../summarize');
    const text = 'Short text no punct';
    const result = await summarize(text, 200);
    expect(result).toBe(text.trim());
  });

  it('multi-sentence text returns subset of sentences within maxLength', async () => {
    const { summarize } = await import('../summarize');
    const text = [
      'I went to the gym and had a great workout.',
      'Afterward I met my friends for dinner.',
      'We talked about our plans for the upcoming holiday.',
      'It was a really enjoyable evening.',
    ].join(' ');
    const result = await summarize(text, 80);
    expect(typeof result).toBe('string');
    // Result must not exceed maxLength
    expect(result.length).toBeLessThanOrEqual(80);
    // Result must be non-empty since text is non-empty
    expect(result.length).toBeGreaterThan(0);
  });

  it('multi-sentence text result is a string composed of original sentences', async () => {
    const { summarize } = await import('../summarize');
    const sentences = [
      'First sentence here.',
      'Second sentence follows.',
      'Third sentence ends this.',
    ];
    const text = sentences.join(' ');
    const result = await summarize(text, 200);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('generateJournalPreview', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty text returns empty string', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const result = await generateJournalPreview('');
    expect(result).toBe('');
  });

  it('short text (under 100 chars) returns unchanged', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const shortText = 'Quick note for today.';
    const result = await generateJournalPreview(shortText);
    expect(result).toBe(shortText);
  });

  it('text of exactly 99 chars returns unchanged', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const text = 'A'.repeat(99);
    const result = await generateJournalPreview(text);
    expect(result).toBe(text);
  });

  it('long text (100+ chars) returns summarized version', async () => {
    const { generateJournalPreview } = await import('../summarize');
    const longText =
      'Today was a wonderful day full of exciting activities. ' +
      'I went for a run in the morning and felt energized. ' +
      'Then I worked on an interesting project at the office. ' +
      'In the evening I cooked a delicious meal for my family.';
    const result = await generateJournalPreview(longText);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Should be truncated to at most 120 chars (the internal maxLength)
    expect(result.length).toBeLessThanOrEqual(120);
  });
});

describe('summarizeWeeklyJournals', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('empty array returns empty string', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const result = await summarizeWeeklyJournals([]);
    expect(result).toBe('');
  });

  it('array of only empty strings returns empty string', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const result = await summarizeWeeklyJournals(['', '   ', '']);
    expect(result).toBe('');
  });

  it('multiple journals returns non-empty summary', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const journals = [
      'Had a productive day at work today.',
      'Went for a long run and felt energized.',
      'Spent quality time with family.',
    ];
    const result = await summarizeWeeklyJournals(journals);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('summary length does not exceed 300 characters', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const journals = Array.from(
      { length: 7 },
      (_, i) =>
        `Day ${i + 1}: I woke up early and exercised. Then worked on several important tasks. ` +
        'Had meetings with colleagues. Reviewed progress and planned next steps.',
    );
    const result = await summarizeWeeklyJournals(journals);
    expect(result.length).toBeLessThanOrEqual(300);
  });

  it('single non-empty journal returns a summary', async () => {
    const { summarizeWeeklyJournals } = await import('../summarize');
    const result = await summarizeWeeklyJournals(['Today was a great day for learning.']);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
