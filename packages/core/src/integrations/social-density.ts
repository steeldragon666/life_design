export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;      // ISO datetime
  endTime: string;        // ISO datetime
  attendeeCount: number;  // 0 = solo event
  isRecurring: boolean;
}

export interface SocialDensityMetrics {
  socialEventsCount: number;    // events with attendees > 0
  totalEventsCount: number;
  socialDensity: number;        // ratio of social to total events
  avgDailyContactHours: number; // average hours with others per day
  isolationRisk: boolean;       // true if density drops >50% from baseline
  longestGapDays: number;       // longest stretch without social events
}

/**
 * Compute social density from calendar events over a window.
 * @param events - Calendar events in the analysis window
 * @param windowDays - Number of days in the window
 * @param baselineDensity - Previous baseline social density (for isolation detection)
 */
export function computeSocialDensity(
  events: CalendarEvent[],
  windowDays: number,
  baselineDensity?: number,
): SocialDensityMetrics {
  const socialEvents = events.filter(e => e.attendeeCount > 0);
  const totalEvents = events.length;
  const socialDensity = totalEvents > 0 ? socialEvents.length / totalEvents : 0;

  // Calculate total social contact hours
  const socialHours = socialEvents.reduce((sum, e) => {
    const start = new Date(e.startTime).getTime();
    const end = new Date(e.endTime).getTime();
    return sum + Math.max(0, (end - start) / 3600000);
  }, 0);

  const avgDailyContactHours = windowDays > 0 ? socialHours / windowDays : 0;

  // Find longest gap between social events
  const socialDates = socialEvents
    .map(e => new Date(e.startTime).toISOString().split('T')[0])
    .filter((v, i, a) => a.indexOf(v) === i) // unique dates
    .sort();

  let longestGapDays = socialDates.length === 0 ? windowDays : 0;
  for (let i = 1; i < socialDates.length; i++) {
    const gap = (new Date(socialDates[i]).getTime() - new Date(socialDates[i - 1]).getTime()) / 86400000;
    longestGapDays = Math.max(longestGapDays, gap);
  }

  // Isolation detection
  const isolationRisk = baselineDensity !== undefined && baselineDensity > 0
    ? socialDensity < baselineDensity * 0.5
    : false;

  return {
    socialEventsCount: socialEvents.length,
    totalEventsCount: totalEvents,
    socialDensity: Math.round(socialDensity * 100) / 100,
    avgDailyContactHours: Math.round(avgDailyContactHours * 100) / 100,
    isolationRisk,
    longestGapDays,
  };
}
