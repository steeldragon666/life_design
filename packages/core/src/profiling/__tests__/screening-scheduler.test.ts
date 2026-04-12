import { describe, it, expect } from 'vitest';
import {
  getScreeningSchedule,
  type ScreeningHistory,
  type ScreeningSchedule,
} from '../screening-scheduler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a Date that is `daysAgo` days before `now`. */
function daysAgo(days: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

const NOW = new Date('2026-04-12T12:00:00Z');

// ---------------------------------------------------------------------------
// 1. Fresh user — no history — all screenings due
// ---------------------------------------------------------------------------

describe('getScreeningSchedule', () => {
  it('marks all screenings due for a fresh user with no history', () => {
    const schedule = getScreeningSchedule([], NOW);
    expect(schedule.phq2Due).toBe(true);
    expect(schedule.gad2Due).toBe(true);
    expect(schedule.phq9Due).toBe(true);
    expect(schedule.gad7Due).toBe(true);
    expect(schedule.who5Due).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. PHQ-2 completed 3 days ago — not due (within 7-day window)
  // -------------------------------------------------------------------------

  it('PHQ-2 not due if completed within 7-day window', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'phq2', completedAt: daysAgo(3, NOW), total: 1 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.phq2Due).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 3. PHQ-2 completed 8 days ago — due again
  // -------------------------------------------------------------------------

  it('PHQ-2 due if completed more than 7 days ago', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'phq2', completedAt: daysAgo(8, NOW), total: 1 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.phq2Due).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. PHQ-2 with score >= 3 — phq9Due becomes true immediately
  // -------------------------------------------------------------------------

  it('PHQ-2 score >= 3 triggers phq9Due immediately', () => {
    const history: ScreeningHistory[] = [
      {
        instrument: 'phq2',
        completedAt: daysAgo(1, NOW),
        total: 3,
        suggestsFullScreening: true,
      },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.phq9Due).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. Full PHQ-9 completed 20 days ago — not due (within 30-day window)
  // -------------------------------------------------------------------------

  it('PHQ-9 not due if completed within 30-day window', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'phq9', completedAt: daysAgo(20, NOW), total: 5 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.phq9Due).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Full PHQ-9 completed 35 days ago — due again
  // -------------------------------------------------------------------------

  it('PHQ-9 due if completed more than 30 days ago', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'phq9', completedAt: daysAgo(35, NOW), total: 5 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.phq9Due).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 7. WHO-5 completed 10 days ago — not due (within 14-day window)
  // -------------------------------------------------------------------------

  it('WHO-5 not due if completed within 14-day window', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'who5', completedAt: daysAgo(10, NOW), total: 15 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.who5Due).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 8. WHO-5 completed 15 days ago — due again
  // -------------------------------------------------------------------------

  it('WHO-5 due if completed more than 14 days ago', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'who5', completedAt: daysAgo(15, NOW), total: 15 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.who5Due).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 9. Multiple screenings — only show what's actually due
  // -------------------------------------------------------------------------

  it('correctly shows only due screenings when multiple are in history', () => {
    const history: ScreeningHistory[] = [
      { instrument: 'phq2', completedAt: daysAgo(3, NOW), total: 1 },   // not due (< 7)
      { instrument: 'gad2', completedAt: daysAgo(8, NOW), total: 2 },   // due (> 7)
      { instrument: 'phq9', completedAt: daysAgo(20, NOW), total: 5 },  // not due (< 30)
      { instrument: 'gad7', completedAt: daysAgo(35, NOW), total: 4 },  // due (> 30)
      { instrument: 'who5', completedAt: daysAgo(10, NOW), total: 15 }, // not due (< 14)
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.phq2Due).toBe(false);
    expect(schedule.gad2Due).toBe(true);
    expect(schedule.phq9Due).toBe(false);
    expect(schedule.gad7Due).toBe(true);
    expect(schedule.who5Due).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 10. nextDue returns the soonest upcoming screening
  // -------------------------------------------------------------------------

  it('nextDue returns the soonest upcoming screening', () => {
    // PHQ-2 completed 5 days ago -> due in 2 days
    // GAD-2 completed 3 days ago -> due in 4 days
    // WHO-5 completed 10 days ago -> due in 4 days
    // PHQ-9 completed 25 days ago -> due in 5 days
    // GAD-7 completed 20 days ago -> due in 10 days
    const history: ScreeningHistory[] = [
      { instrument: 'phq2', completedAt: daysAgo(5, NOW), total: 1 },
      { instrument: 'gad2', completedAt: daysAgo(3, NOW), total: 1 },
      { instrument: 'who5', completedAt: daysAgo(10, NOW), total: 15 },
      { instrument: 'phq9', completedAt: daysAgo(25, NOW), total: 5 },
      { instrument: 'gad7', completedAt: daysAgo(20, NOW), total: 4 },
    ];
    const schedule = getScreeningSchedule(history, NOW);

    expect(schedule.nextDue).not.toBeNull();
    // PHQ-2 is due soonest: completed 5 days ago, window is 7, so due in 2 days
    expect(schedule.nextDue!.instrument).toBe('phq2');

    const expectedDate = new Date(NOW);
    expectedDate.setDate(expectedDate.getDate() + 2);
    expect(schedule.nextDue!.dueDate.getTime()).toBe(expectedDate.getTime());
  });

  it('nextDue is null when all screenings are currently due', () => {
    // Fresh user — everything is due right now, nothing upcoming
    const schedule = getScreeningSchedule([], NOW);
    expect(schedule.nextDue).toBeNull();
  });

  // -------------------------------------------------------------------------
  // GAD-2 with score >= 3 triggers gad7Due
  // -------------------------------------------------------------------------

  it('GAD-2 score >= 3 triggers gad7Due immediately', () => {
    const history: ScreeningHistory[] = [
      {
        instrument: 'gad2',
        completedAt: daysAgo(1, NOW),
        total: 4,
        suggestsFullScreening: true,
      },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    expect(schedule.gad7Due).toBe(true);
  });

  // -------------------------------------------------------------------------
  // PHQ-9 already done recently suppresses short-form trigger
  // -------------------------------------------------------------------------

  it('PHQ-2 high score does not trigger PHQ-9 if PHQ-9 was recently completed', () => {
    const history: ScreeningHistory[] = [
      {
        instrument: 'phq2',
        completedAt: daysAgo(1, NOW),
        total: 4,
        suggestsFullScreening: true,
      },
      { instrument: 'phq9', completedAt: daysAgo(5, NOW), total: 8 },
    ];
    const schedule = getScreeningSchedule(history, NOW);
    // PHQ-9 was done 5 days ago (within 30-day window) — should not be due
    expect(schedule.phq9Due).toBe(false);
  });
});
