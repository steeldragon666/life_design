import { describe, it, expect } from 'vitest';
import {
  computeSocialDensity,
  type CalendarEvent,
} from '../social-density';

function makeEvent(
  overrides: Partial<CalendarEvent> & { startTime: string; endTime: string },
): CalendarEvent {
  return {
    id: overrides.id ?? 'evt-1',
    title: overrides.title ?? 'Event',
    startTime: overrides.startTime,
    endTime: overrides.endTime,
    attendeeCount: overrides.attendeeCount ?? 0,
    isRecurring: overrides.isRecurring ?? false,
  };
}

describe('computeSocialDensity', () => {
  it('returns zeros for empty events', () => {
    const result = computeSocialDensity([], 7);
    expect(result.socialEventsCount).toBe(0);
    expect(result.totalEventsCount).toBe(0);
    expect(result.socialDensity).toBe(0);
    expect(result.avgDailyContactHours).toBe(0);
    expect(result.isolationRisk).toBe(false);
    expect(result.longestGapDays).toBe(7);
  });

  it('returns density=1.0 when all events are social', () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 3 }),
      makeEvent({ id: '2', startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-02T11:00:00Z', attendeeCount: 2 }),
    ];
    const result = computeSocialDensity(events, 7);
    expect(result.socialDensity).toBe(1.0);
    expect(result.socialEventsCount).toBe(2);
    expect(result.totalEventsCount).toBe(2);
  });

  it('returns density=0 when all events are solo', () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 0 }),
      makeEvent({ id: '2', startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-02T11:00:00Z', attendeeCount: 0 }),
    ];
    const result = computeSocialDensity(events, 7);
    expect(result.socialDensity).toBe(0);
    expect(result.socialEventsCount).toBe(0);
  });

  it('computes correct ratio for mixed events', () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 2 }),
      makeEvent({ id: '2', startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-02T11:00:00Z', attendeeCount: 0 }),
      makeEvent({ id: '3', startTime: '2025-01-03T10:00:00Z', endTime: '2025-01-03T11:00:00Z', attendeeCount: 0 }),
      makeEvent({ id: '4', startTime: '2025-01-04T10:00:00Z', endTime: '2025-01-04T11:00:00Z', attendeeCount: 5 }),
    ];
    const result = computeSocialDensity(events, 7);
    expect(result.socialDensity).toBe(0.5);
    expect(result.socialEventsCount).toBe(2);
    expect(result.totalEventsCount).toBe(4);
  });

  it('computes avgDailyContactHours correctly', () => {
    const events: CalendarEvent[] = [
      // 2 hour social event
      makeEvent({ id: '1', startTime: '2025-01-01T09:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 3 }),
      // 1 hour social event
      makeEvent({ id: '2', startTime: '2025-01-03T14:00:00Z', endTime: '2025-01-03T15:00:00Z', attendeeCount: 2 }),
      // solo event - should not count
      makeEvent({ id: '3', startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-02T12:00:00Z', attendeeCount: 0 }),
    ];
    // 3 social hours over 7 days = 0.43 hours/day
    const result = computeSocialDensity(events, 7);
    expect(result.avgDailyContactHours).toBe(0.43);
  });

  it('computes longest gap between social events', () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 2 }),
      // 3-day gap
      makeEvent({ id: '2', startTime: '2025-01-04T10:00:00Z', endTime: '2025-01-04T11:00:00Z', attendeeCount: 3 }),
      // 1-day gap
      makeEvent({ id: '3', startTime: '2025-01-05T10:00:00Z', endTime: '2025-01-05T11:00:00Z', attendeeCount: 1 }),
    ];
    const result = computeSocialDensity(events, 7);
    expect(result.longestGapDays).toBe(3);
  });

  it('sets isolationRisk=true when density drops >50% from baseline', () => {
    // All solo events => density=0, baseline=0.8 => 0 < 0.4 => isolation
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 0 }),
    ];
    const result = computeSocialDensity(events, 7, 0.8);
    expect(result.isolationRisk).toBe(true);
  });

  it('sets isolationRisk=false when no baseline is provided', () => {
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 0 }),
    ];
    const result = computeSocialDensity(events, 7);
    expect(result.isolationRisk).toBe(false);
  });

  it('sets isolationRisk=false when density is above threshold', () => {
    // 1 social out of 2 => density=0.5, baseline=0.6 => 0.5 >= 0.3 => no isolation
    const events: CalendarEvent[] = [
      makeEvent({ id: '1', startTime: '2025-01-01T10:00:00Z', endTime: '2025-01-01T11:00:00Z', attendeeCount: 2 }),
      makeEvent({ id: '2', startTime: '2025-01-02T10:00:00Z', endTime: '2025-01-02T11:00:00Z', attendeeCount: 0 }),
    ];
    const result = computeSocialDensity(events, 7, 0.6);
    expect(result.isolationRisk).toBe(false);
  });
});
