import { describe, it, expect } from 'vitest';
import {
  analyzeSleepSession,
  analyzeCircadianPattern,
  computeSleepQualityScore,
  type SleepSession,
  type SleepArchitectureMetrics,
} from '../sleep-architecture';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an ISO datetime from a date string and HH:MM time. */
function dt(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

// ---------------------------------------------------------------------------
// 1. Perfect night
// ---------------------------------------------------------------------------

describe('analyzeSleepSession', () => {
  it('scores a perfect night highly (8h, 20% REM, 20% deep, high efficiency)', () => {
    const session: SleepSession = {
      date: '2026-04-10',
      bedtime: dt('2026-04-10', '22:00'),
      wakeTime: dt('2026-04-11', '06:00'),
      stages: {
        rem: 96, // 20% of 480
        deep: 96, // 20%
        light: 270, // 56.25%
        awake: 18, // 3.75%
      },
      totalMinutes: 462, // rem+deep+light = 462
    };

    const metrics = analyzeSleepSession(session);

    expect(metrics.sleepEfficiency).toBeGreaterThan(90);
    expect(metrics.remPercent).toBeCloseTo(20, 0);
    expect(metrics.deepPercent).toBeCloseTo(20, 0);
    expect(metrics.waso).toBe(18);
    expect(metrics.qualityScore).toBeGreaterThan(80);
  });

  // ---------------------------------------------------------------------------
  // 2. Poor night
  // ---------------------------------------------------------------------------

  it('scores a poor night low (frequent waking, low deep sleep)', () => {
    const session: SleepSession = {
      date: '2026-04-10',
      bedtime: dt('2026-04-10', '23:00'),
      wakeTime: dt('2026-04-11', '06:00'),
      stages: {
        rem: 30, // ~8.6%
        deep: 15, // ~4.3%
        light: 200, // ~57%
        awake: 105, // ~30% — frequent waking
      },
      totalMinutes: 245, // rem+deep+light
    };

    const metrics = analyzeSleepSession(session);

    expect(metrics.sleepEfficiency).toBeLessThan(65);
    expect(metrics.waso).toBe(105);
    expect(metrics.qualityScore).toBeLessThan(40);
  });

  // ---------------------------------------------------------------------------
  // 3. No stage data
  // ---------------------------------------------------------------------------

  it('handles missing stage data gracefully', () => {
    const session: SleepSession = {
      date: '2026-04-10',
      bedtime: dt('2026-04-10', '22:30'),
      wakeTime: dt('2026-04-11', '06:30'),
      totalMinutes: 450,
    };

    const metrics = analyzeSleepSession(session);

    // Stage percentages should be null
    expect(metrics.remPercent).toBeNull();
    expect(metrics.deepPercent).toBeNull();
    expect(metrics.lightPercent).toBeNull();
    expect(metrics.awakePercent).toBeNull();

    // Efficiency and latency should still be computed
    expect(metrics.sleepEfficiency).toBeGreaterThan(0);
    expect(metrics.sleepLatency).toBeGreaterThanOrEqual(0);
    // Quality score should still be a reasonable number
    expect(metrics.qualityScore).toBeGreaterThan(0);
    expect(metrics.qualityScore).toBeLessThanOrEqual(100);
  });

  // ---------------------------------------------------------------------------
  // 7a. Edge case: very short sleep (<4h)
  // ---------------------------------------------------------------------------

  it('handles very short sleep (<4h) with a low quality score', () => {
    const session: SleepSession = {
      date: '2026-04-10',
      bedtime: dt('2026-04-11', '02:00'),
      wakeTime: dt('2026-04-11', '05:30'),
      stages: {
        rem: 15, // very low REM
        deep: 10, // very low deep
        light: 100,
        awake: 45, // lots of waking in short period
      },
      totalMinutes: 125,
    };

    const metrics = analyzeSleepSession(session);
    expect(metrics.qualityScore).toBeLessThan(60);
    expect(metrics.sleepEfficiency).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 7b. Edge case: very long sleep (>10h)
  // ---------------------------------------------------------------------------

  it('handles very long sleep (>10h) with duration penalty', () => {
    const session: SleepSession = {
      date: '2026-04-10',
      bedtime: dt('2026-04-10', '20:00'),
      wakeTime: dt('2026-04-11', '08:00'),
      stages: {
        rem: 144, // 20%
        deep: 108, // 15%
        light: 380,
        awake: 30,
      },
      totalMinutes: 632,
    };

    const metrics = analyzeSleepSession(session);
    // Still a reasonable score but penalised for excess duration
    expect(metrics.qualityScore).toBeLessThan(95);
    expect(metrics.sleepEfficiency).toBeGreaterThan(85);
  });
});

// ---------------------------------------------------------------------------
// Quality score function
// ---------------------------------------------------------------------------

describe('computeSleepQualityScore', () => {
  it('returns a high score for ideal metrics', () => {
    const metrics: SleepArchitectureMetrics = {
      sleepEfficiency: 92,
      sleepLatency: 8,
      waso: 10,
      remPercent: 22,
      deepPercent: 18,
      lightPercent: 55,
      awakePercent: 5,
      qualityScore: 0,
    };
    const score = computeSleepQualityScore(metrics, 480);
    expect(score).toBeGreaterThan(85);
  });

  it('returns a low score for poor metrics', () => {
    const metrics: SleepArchitectureMetrics = {
      sleepEfficiency: 55,
      sleepLatency: 45,
      waso: 70,
      remPercent: 5,
      deepPercent: 3,
      lightPercent: 80,
      awakePercent: 12,
      qualityScore: 0,
    };
    const score = computeSleepQualityScore(metrics, 280);
    expect(score).toBeLessThan(30);
  });

  it('works without totalMinutes', () => {
    const metrics: SleepArchitectureMetrics = {
      sleepEfficiency: 85,
      sleepLatency: 15,
      waso: 20,
      remPercent: null,
      deepPercent: null,
      lightPercent: null,
      awakePercent: null,
      qualityScore: 0,
    };
    const score = computeSleepQualityScore(metrics);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Circadian pattern analysis
// ---------------------------------------------------------------------------

describe('analyzeCircadianPattern', () => {
  // ---------------------------------------------------------------------------
  // 4. Consistent schedule → high regularity
  // ---------------------------------------------------------------------------

  it('gives high regularity score for a consistent schedule', () => {
    const sessions: SleepSession[] = Array.from({ length: 7 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const nextDay = String(i + 2).padStart(2, '0');
      return {
        date: `2026-04-${day}`,
        bedtime: dt(`2026-04-${day}`, '22:30'),
        wakeTime: dt(`2026-04-${nextDay}`, '06:30'),
        totalMinutes: 480,
      };
    });

    const circadian = analyzeCircadianPattern(sessions);

    expect(circadian.regularityScore).toBeGreaterThan(90);
    expect(circadian.bedtimeVariability).toBeLessThan(5);
    expect(circadian.wakeTimeVariability).toBeLessThan(5);
    expect(circadian.averageBedtime).toBe('22:30');
    expect(circadian.averageWakeTime).toBe('06:30');
  });

  // ---------------------------------------------------------------------------
  // 5. Irregular schedule → low regularity
  // ---------------------------------------------------------------------------

  it('gives low regularity score for an irregular schedule', () => {
    const sessions: SleepSession[] = [
      { date: '2026-04-01', bedtime: dt('2026-04-01', '21:00'), wakeTime: dt('2026-04-02', '05:00'), totalMinutes: 480 },
      { date: '2026-04-02', bedtime: dt('2026-04-03', '01:00'), wakeTime: dt('2026-04-03', '10:00'), totalMinutes: 540 },
      { date: '2026-04-03', bedtime: dt('2026-04-03', '22:00'), wakeTime: dt('2026-04-04', '06:00'), totalMinutes: 480 },
      { date: '2026-04-04', bedtime: dt('2026-04-05', '02:00'), wakeTime: dt('2026-04-05', '11:00'), totalMinutes: 540 },
      { date: '2026-04-05', bedtime: dt('2026-04-05', '20:00'), wakeTime: dt('2026-04-06', '04:00'), totalMinutes: 480 },
      { date: '2026-04-06', bedtime: dt('2026-04-07', '00:30'), wakeTime: dt('2026-04-07', '09:00'), totalMinutes: 510 },
      { date: '2026-04-07', bedtime: dt('2026-04-07', '23:00'), wakeTime: dt('2026-04-08', '07:00'), totalMinutes: 480 },
    ];

    const circadian = analyzeCircadianPattern(sessions);

    expect(circadian.regularityScore).toBeLessThan(50);
    expect(circadian.bedtimeVariability).toBeGreaterThan(60);
  });

  // ---------------------------------------------------------------------------
  // 6. Social jet lag detection (2h weekend shift)
  // ---------------------------------------------------------------------------

  it('detects social jet lag from a 2-hour weekend shift', () => {
    // Weekday sessions (Mon-Thu): bed 22:30, wake 06:30 → midpoint ~02:30 (=150 min past midnight)
    // Weekend sessions (Fri-Sun): bed 00:30, wake 08:30 → midpoint ~04:30 (=270 min past midnight)
    // Difference = ~120 min = 2h social jet lag
    const sessions: SleepSession[] = [
      // Monday
      { date: '2026-04-06', bedtime: dt('2026-04-06', '22:30'), wakeTime: dt('2026-04-07', '06:30'), totalMinutes: 480 },
      // Tuesday
      { date: '2026-04-07', bedtime: dt('2026-04-07', '22:30'), wakeTime: dt('2026-04-08', '06:30'), totalMinutes: 480 },
      // Wednesday
      { date: '2026-04-08', bedtime: dt('2026-04-08', '22:30'), wakeTime: dt('2026-04-09', '06:30'), totalMinutes: 480 },
      // Thursday
      { date: '2026-04-09', bedtime: dt('2026-04-09', '22:30'), wakeTime: dt('2026-04-10', '06:30'), totalMinutes: 480 },
      // Friday (weekend)
      { date: '2026-04-10', bedtime: dt('2026-04-11', '00:30'), wakeTime: dt('2026-04-11', '08:30'), totalMinutes: 480 },
      // Saturday (weekend)
      { date: '2026-04-11', bedtime: dt('2026-04-12', '00:30'), wakeTime: dt('2026-04-12', '08:30'), totalMinutes: 480 },
      // Sunday (weekend)
      { date: '2026-04-12', bedtime: dt('2026-04-13', '00:30'), wakeTime: dt('2026-04-13', '08:30'), totalMinutes: 480 },
    ];

    const circadian = analyzeCircadianPattern(sessions);

    // Social jet lag should be approximately 120 minutes (2 hours)
    expect(circadian.socialJetLag).toBeGreaterThan(100);
    expect(circadian.socialJetLag).toBeLessThan(140);
  });

  it('returns zero metrics for empty session array', () => {
    const circadian = analyzeCircadianPattern([]);
    expect(circadian.regularityScore).toBe(0);
    expect(circadian.socialJetLag).toBe(0);
  });
});
