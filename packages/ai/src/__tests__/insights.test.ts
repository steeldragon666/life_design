import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dimension } from '@life-design/core';

const mockCreate = vi.fn();

vi.mock('../client', () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import { generateInsights } from '../insights';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateInsights', () => {
  const sampleScores = [
    {
      date: '2025-01-10',
      mood: 7,
      scores: [
        { dimension: Dimension.Health, score: 8 },
        { dimension: Dimension.Career, score: 6 },
      ],
    },
    {
      date: '2025-01-11',
      mood: 6,
      scores: [
        { dimension: Dimension.Health, score: 7 },
        { dimension: Dimension.Career, score: 5 },
      ],
    },
    {
      date: '2025-01-12',
      mood: 8,
      scores: [
        { dimension: Dimension.Health, score: 9 },
        { dimension: Dimension.Career, score: 7 },
      ],
    },
  ];

  it('returns parsed insights from Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify([
            {
              type: 'trend',
              title: 'Health is improving',
              body: 'Your health scores show an upward trend over the past 3 days.',
              dimension: 'health',
            },
            {
              type: 'suggestion',
              title: 'Focus on career',
              body: 'Career scores have been inconsistent. Consider setting daily goals.',
              dimension: 'career',
            },
          ]),
        },
      ],
    });

    const insights = await generateInsights(sampleScores);

    expect(insights).toHaveLength(2);
    expect(insights[0].type).toBe('trend');
    expect(insights[0].title).toBe('Health is improving');
    expect(insights[0].dimension).toBe('health');
    expect(insights[1].type).toBe('suggestion');
  });

  it('sends check-in data to Claude with analysis prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '[]' }],
    });

    await generateInsights(sampleScores);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-20250514',
        system: expect.stringContaining('Analyze'),
      }),
    );
  });

  it('returns empty array on API failure', async () => {
    mockCreate.mockRejectedValue(new Error('API error'));

    const insights = await generateInsights(sampleScores);

    expect(insights).toEqual([]);
  });

  it('returns empty array on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    });

    const insights = await generateInsights(sampleScores);

    expect(insights).toEqual([]);
  });

  it('returns empty array when given no data', async () => {
    const insights = await generateInsights([]);

    expect(insights).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
