import {
  PHQ9_NATURAL_ITEMS,
  GAD7_NATURAL_ITEMS,
  createAssessmentSession,
  scoreCompletedAssessment,
} from '../assessment-embedding.js';
import { recordAssessmentResponse, isAssessmentComplete } from '../assessment-embedding.js';

describe('PHQ9_NATURAL_ITEMS', () => {
  it('has exactly 9 items', () => {
    expect(PHQ9_NATURAL_ITEMS).toHaveLength(9);
  });

  it('each item has at least 2 natural phrasings', () => {
    for (const item of PHQ9_NATURAL_ITEMS) {
      expect(Array.isArray(item.naturalPhrasings)).toBe(true);
      expect(item.naturalPhrasings.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each item has instrument set to PHQ-9', () => {
    for (const item of PHQ9_NATURAL_ITEMS) {
      expect(item.instrument).toBe('PHQ-9');
    }
  });

  it('items are indexed 0 through 8', () => {
    const indices = PHQ9_NATURAL_ITEMS.map((i) => i.itemIndex);
    for (let n = 0; n <= 8; n++) {
      expect(indices).toContain(n);
    }
  });

  it('each item has a non-empty originalText', () => {
    for (const item of PHQ9_NATURAL_ITEMS) {
      expect(typeof item.originalText).toBe('string');
      expect(item.originalText.length).toBeGreaterThan(0);
    }
  });

  it('score is null by default', () => {
    for (const item of PHQ9_NATURAL_ITEMS) {
      expect(item.score).toBeNull();
    }
  });
});

describe('GAD7_NATURAL_ITEMS', () => {
  it('has exactly 7 items', () => {
    expect(GAD7_NATURAL_ITEMS).toHaveLength(7);
  });

  it('each item has at least 2 natural phrasings', () => {
    for (const item of GAD7_NATURAL_ITEMS) {
      expect(item.naturalPhrasings.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each item has instrument set to GAD-7', () => {
    for (const item of GAD7_NATURAL_ITEMS) {
      expect(item.instrument).toBe('GAD-7');
    }
  });

  it('items are indexed 0 through 6', () => {
    const indices = GAD7_NATURAL_ITEMS.map((i) => i.itemIndex);
    for (let n = 0; n <= 6; n++) {
      expect(indices).toContain(n);
    }
  });
});

describe('createAssessmentSession', () => {
  it('returns a valid session structure for PHQ-9', () => {
    const session = createAssessmentSession('u-1', 'PHQ-9');
    expect(session.userId).toBe('u-1');
    expect(session.instrument).toBe('PHQ-9');
    expect(session.totalItems).toBe(9);
    expect(session.completedItems).toBe(0);
    expect(session.totalScore).toBeNull();
    expect(session.severity).toBeNull();
    expect(session.completedAt).toBeNull();
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(Array.isArray(session.items)).toBe(true);
    expect(session.items).toHaveLength(9);
  });

  it('returns a valid session structure for GAD-7', () => {
    const session = createAssessmentSession('u-2', 'GAD-7');
    expect(session.instrument).toBe('GAD-7');
    expect(session.totalItems).toBe(7);
    expect(session.items).toHaveLength(7);
  });

  it('deep-copies items so mutations do not affect source constants', () => {
    const session = createAssessmentSession('u-3', 'PHQ-9');
    // Mutate a phrasing on the session copy
    session.items[0]!.naturalPhrasings[0] = 'MUTATED';
    // Source constant should be unaffected
    expect(PHQ9_NATURAL_ITEMS[0]!.naturalPhrasings[0]).not.toBe('MUTATED');
  });

  it('all items start with null score', () => {
    const session = createAssessmentSession('u-4', 'GAD-7');
    for (const item of session.items) {
      expect(item.score).toBeNull();
    }
  });
});

describe('scoreCompletedAssessment', () => {
  function completeSession(instrument: 'PHQ-9' | 'GAD-7', scorePerItem: number) {
    let session = createAssessmentSession('u-score', instrument);
    for (let i = 0; i < session.totalItems; i++) {
      session = recordAssessmentResponse(session, i, scorePerItem);
    }
    return session;
  }

  it('computes correct total score (all zeros → 0)', () => {
    const session = completeSession('PHQ-9', 0);
    expect(isAssessmentComplete(session)).toBe(true);
    const { totalScore, severity } = scoreCompletedAssessment(session);
    expect(totalScore).toBe(0);
    expect(severity).toBe('minimal');
  });

  it('computes correct total score for PHQ-9 (all 3 → 27)', () => {
    const session = completeSession('PHQ-9', 3);
    const { totalScore, severity } = scoreCompletedAssessment(session);
    expect(totalScore).toBe(27);
    expect(severity).toBe('severe');
  });

  it('computes correct total score for GAD-7 (all 1 → 7)', () => {
    const session = completeSession('GAD-7', 1);
    const { totalScore } = scoreCompletedAssessment(session);
    expect(totalScore).toBe(7);
  });

  it('correctly classifies PHQ-9 score of 10 as moderate', () => {
    // Need a score of 10 — can't do this with uniform scores easily;
    // mix 0s and 1s. 9 items × mix to reach 10.
    let session = createAssessmentSession('u-moderate', 'PHQ-9');
    // Score first 8 items as 1, last one as 2 → total = 10
    for (let i = 0; i < 8; i++) {
      session = recordAssessmentResponse(session, i, 1);
    }
    session = recordAssessmentResponse(session, 8, 2);
    const { totalScore, severity } = scoreCompletedAssessment(session);
    expect(totalScore).toBe(10);
    expect(severity).toBe('moderate');
  });

  it('throws when session is incomplete', () => {
    const incomplete = createAssessmentSession('u-incomplete', 'PHQ-9');
    expect(() => scoreCompletedAssessment(incomplete)).toThrow();
  });

  it('returns both totalScore and severity', () => {
    const session = completeSession('GAD-7', 2);
    const result = scoreCompletedAssessment(session);
    expect(typeof result.totalScore).toBe('number');
    expect(typeof result.severity).toBe('string');
    expect(result.severity.length).toBeGreaterThan(0);
  });
});
