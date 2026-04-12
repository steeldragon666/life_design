import {
  createDefaultRelationalMemory,
  determinePhase,
  updateRelationalMetrics,
  addMilestone,
} from '../relational';
import { DRMPhase } from '../../types';
import type { RelationalMemory, RelationalMilestone } from '../../types';

describe('determinePhase', () => {
  function memoryWithSessions(count: number): RelationalMemory {
    const base = createDefaultRelationalMemory('u1');
    return { ...base, totalSessions: count };
  }

  it('returns Initial for 0 sessions', () => {
    expect(determinePhase(memoryWithSessions(0))).toBe(DRMPhase.Initial);
  });

  it('returns Initial for 6 sessions (boundary)', () => {
    expect(determinePhase(memoryWithSessions(6))).toBe(DRMPhase.Initial);
  });

  it('returns Calibration for 7 sessions', () => {
    expect(determinePhase(memoryWithSessions(7))).toBe(DRMPhase.Calibration);
  });

  it('returns Calibration for 18 sessions (boundary)', () => {
    expect(determinePhase(memoryWithSessions(18))).toBe(DRMPhase.Calibration);
  });

  it('returns Personalised for 19 sessions', () => {
    expect(determinePhase(memoryWithSessions(19))).toBe(DRMPhase.Personalised);
  });

  it('returns Personalised for 42 sessions (boundary)', () => {
    expect(determinePhase(memoryWithSessions(42))).toBe(DRMPhase.Personalised);
  });

  it('returns Deepening for 43 sessions', () => {
    expect(determinePhase(memoryWithSessions(43))).toBe(DRMPhase.Deepening);
  });

  it('returns Deepening for 100 sessions', () => {
    expect(determinePhase(memoryWithSessions(100))).toBe(DRMPhase.Deepening);
  });
});

describe('updateRelationalMetrics', () => {
  it('increments totalSessions by 1', () => {
    const base = createDefaultRelationalMemory('u2');
    const updated = updateRelationalMetrics(base, {
      duration: 600,
      messageCount: 10,
      timestamp: new Date(),
    });
    expect(updated.totalSessions).toBe(1);
  });

  it('increments totalMessages by the session message count', () => {
    const base = createDefaultRelationalMemory('u3');
    const updated = updateRelationalMetrics(base, {
      duration: 600,
      messageCount: 15,
      timestamp: new Date(),
    });
    expect(updated.totalMessages).toBe(15);
  });

  it('accumulates correctly across multiple updates', () => {
    let memory = createDefaultRelationalMemory('u4');
    const ts = new Date();
    memory = updateRelationalMetrics(memory, { duration: 300, messageCount: 5, timestamp: ts });
    memory = updateRelationalMetrics(memory, { duration: 300, messageCount: 8, timestamp: ts });
    expect(memory.totalSessions).toBe(2);
    expect(memory.totalMessages).toBe(13);
  });

  it('recalculates phase after increment', () => {
    // Start with 6 sessions (Initial), add one → 7 → Calibration
    const base = { ...createDefaultRelationalMemory('u5'), totalSessions: 6 };
    const updated = updateRelationalMetrics(base, {
      duration: 300,
      messageCount: 1,
      timestamp: new Date(),
    });
    expect(updated.currentPhase).toBe(DRMPhase.Calibration);
  });

  it('updates lastUpdated to the session timestamp', () => {
    const base = createDefaultRelationalMemory('u6');
    const sessionTime = new Date('2025-03-01T10:00:00Z');
    const updated = updateRelationalMetrics(base, {
      duration: 300,
      messageCount: 5,
      timestamp: sessionTime,
    });
    expect(updated.lastUpdated).toEqual(sessionTime);
  });

  it('does not mutate the original memory', () => {
    const base = createDefaultRelationalMemory('u7');
    const original = base.totalSessions;
    updateRelationalMetrics(base, { duration: 300, messageCount: 5, timestamp: new Date() });
    expect(base.totalSessions).toBe(original);
  });
});

describe('addMilestone', () => {
  it('appends the milestone to the milestones array', () => {
    const base = createDefaultRelationalMemory('u8');
    const milestone: RelationalMilestone = {
      date: new Date('2025-01-15'),
      event: 'First breakthrough moment',
      significance: 'major',
    };

    const updated = addMilestone(base, milestone);
    expect(updated.milestones).toHaveLength(1);
    expect(updated.milestones[0]!.event).toBe('First breakthrough moment');
  });

  it('returns a new object (immutability)', () => {
    const base = createDefaultRelationalMemory('u9');
    const milestone: RelationalMilestone = {
      date: new Date(),
      event: 'Some event',
      significance: 'minor',
    };
    const updated = addMilestone(base, milestone);
    expect(updated).not.toBe(base);
    expect(base.milestones).toHaveLength(0);
  });

  it('keeps milestones sorted by date ascending', () => {
    let memory = createDefaultRelationalMemory('u10');
    const m1: RelationalMilestone = {
      date: new Date('2025-03-01'),
      event: 'Later event',
      significance: 'minor',
    };
    const m2: RelationalMilestone = {
      date: new Date('2025-01-01'),
      event: 'Earlier event',
      significance: 'moderate',
    };

    memory = addMilestone(memory, m1);
    memory = addMilestone(memory, m2);

    expect(memory.milestones[0]!.event).toBe('Earlier event');
    expect(memory.milestones[1]!.event).toBe('Later event');
  });

  it('updates lastUpdated', () => {
    const base = createDefaultRelationalMemory('u11');
    const before = Date.now();
    const updated = addMilestone(base, {
      date: new Date(),
      event: 'Test',
      significance: 'minor',
    });
    expect(updated.lastUpdated.getTime()).toBeGreaterThanOrEqual(before);
  });
});
