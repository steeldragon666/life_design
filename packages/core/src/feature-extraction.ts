import { Dimension, IntegrationProvider } from './enums';

export interface NormalizedSignal {
  dimension: Dimension;
  score: number;
  confidence: number;
  rawData: unknown;
}

// ---------------------------------------------------------------------------
// Typed connector interfaces
// ---------------------------------------------------------------------------

export interface StravaActivity {
  type: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  startDate: Date;
  averageHeartRate?: number;
  maxHeartRate?: number;
  sufferedScore?: number;
}

export interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  attendees?: number;
  isRecurring: boolean;
}

export interface NormalisedFeature {
  feature: string;
  dimension: Dimension;
  value: number;
  source: string;
  confidence: number;
  recordedAt: Date;
}


type UnknownRecord = Record<string, unknown>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueCount(values: Array<string | null | undefined>): number {
  const distinct = new Set(values.filter((value): value is string => Boolean(value)));
  return distinct.size;
}

function scoreFromRatio(value: number, target: number): number {
  if (target <= 0) return 0;
  return clamp((value / target) * 10, 0, 10);
}

function withSignal(
  dimension: Dimension,
  score: number,
  confidence: number,
  rawData: unknown,
): NormalizedSignal {
  return {
    dimension,
    score: clamp(score, 0, 10),
    confidence: clamp(confidence, 0, 1),
    rawData,
  };
}

function mapAppleHealth(payload: unknown): NormalizedSignal[] {
  const record = toRecord(payload);
  if (!record) return [];

  const steps = toFiniteNumber(record.steps) ?? toFiniteNumber(record.step_count) ?? 0;
  const sleepHours =
    toFiniteNumber(record.sleep_hours) ??
    toFiniteNumber(record.sleepHours) ??
    toFiniteNumber(record.sleep_duration_hours) ??
    0;
  const restingHeartRate =
    toFiniteNumber(record.resting_heart_rate) ?? toFiniteNumber(record.restingHeartRate) ?? 0;
  const workouts =
    toFiniteNumber(record.workouts_count) ?? toFiniteNumber(record.workoutCount) ?? 0;
  const activeEnergyKcal =
    toFiniteNumber(record.active_energy_kcal) ?? toFiniteNumber(record.activeEnergyKcal) ?? 0;

  const healthScore =
    scoreFromRatio(steps, 9000) * 0.35 +
    scoreFromRatio(sleepHours, 8) * 0.35 +
    scoreFromRatio(70 - clamp(restingHeartRate, 45, 95), 25) * 0.2 +
    scoreFromRatio(activeEnergyKcal, 500) * 0.1;

  const fitnessScore =
    scoreFromRatio(workouts, 5) * 0.5 +
    scoreFromRatio(activeEnergyKcal, 700) * 0.3 +
    scoreFromRatio(steps, 12000) * 0.2;

  const evidencePoints =
    Number(steps > 0) +
    Number(sleepHours > 0) +
    Number(restingHeartRate > 0) +
    Number(workouts > 0) +
    Number(activeEnergyKcal > 0);
  const confidence = clamp(evidencePoints / 5, 0.2, 1);

  return [
    withSignal(Dimension.Health, healthScore, confidence, payload),
    withSignal(Dimension.Fitness, fitnessScore, confidence, payload),
  ];
}

function mapStrava(payload: unknown): NormalizedSignal[] {
  const record = toRecord(payload);
  const activities = toArray(record?.items ?? record?.data ?? payload);
  if (activities.length === 0) return [];

  let totalMovingMinutes = 0;
  let totalDistanceKm = 0;
  let weightedHeartRate = 0;
  let hrSamples = 0;

  for (const activity of activities) {
    const activityRecord = toRecord(activity);
    if (!activityRecord) continue;

    const movingSeconds = toFiniteNumber(activityRecord.moving_time) ?? 0;
    const distanceMeters = toFiniteNumber(activityRecord.distance) ?? 0;
    const avgHeartRate = toFiniteNumber(activityRecord.average_heartrate);

    totalMovingMinutes += movingSeconds / 60;
    totalDistanceKm += distanceMeters / 1000;
    if (avgHeartRate !== null) {
      weightedHeartRate += avgHeartRate;
      hrSamples += 1;
    }
  }

  const avgHeartRate = hrSamples > 0 ? weightedHeartRate / hrSamples : 0;
  const consistencyScore = scoreFromRatio(activities.length, 6);
  const volumeScore = scoreFromRatio(totalMovingMinutes, 180);
  const enduranceScore = scoreFromRatio(totalDistanceKm, 35);
  const intensityScore = avgHeartRate > 0 ? scoreFromRatio(avgHeartRate, 150) : 50;

  const score =
    consistencyScore * 0.25 + volumeScore * 0.35 + enduranceScore * 0.25 + intensityScore * 0.15;
  const confidence = clamp((activities.length / 12) * 0.9 + (hrSamples > 0 ? 0.1 : 0), 0.25, 1);

  return [withSignal(Dimension.Fitness, score, confidence, payload)];
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function mapGoogleCalendar(payload: unknown): NormalizedSignal[] {
  const record = toRecord(payload);
  const items = toArray(record?.items ?? payload);
  if (items.length === 0) return [];

  let timedEvents = 0;
  let upcomingEvents = 0;
  let totalDurationHours = 0;
  let focusKeywordHits = 0;
  let calendarListEntries = 0;

  for (const item of items) {
    const itemRecord = toRecord(item);
    if (!itemRecord) continue;

    const hasSummary = typeof itemRecord.summary === 'string';
    const hasStart = toRecord(itemRecord.start) || parseDateValue(itemRecord.start?.toString());
    const hasEnd = toRecord(itemRecord.end) || parseDateValue(itemRecord.end?.toString());

    if (!hasSummary && !hasStart && !hasEnd) {
      calendarListEntries += 1;
      continue;
    }

    const startRecord = toRecord(itemRecord.start);
    const endRecord = toRecord(itemRecord.end);
    const start =
      parseDateValue(startRecord?.dateTime ?? startRecord?.date ?? itemRecord.start) ??
      parseDateValue(itemRecord.created);
    const end = parseDateValue(endRecord?.dateTime ?? endRecord?.date ?? itemRecord.end);

    if (start && end && end > start) {
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalDurationHours += clamp(durationHours, 0, 16);
      timedEvents += 1;
    }

    if (start && start >= new Date()) {
      upcomingEvents += 1;
    }

    const summary = typeof itemRecord.summary === 'string' ? itemRecord.summary.toLowerCase() : '';
    if (summary.includes('focus') || summary.includes('deep work') || summary.includes('study')) {
      focusKeywordHits += 1;
    }
  }

  if (timedEvents === 0 && calendarListEntries > 0) {
    const score = 4 + Math.min(calendarListEntries, 5) * 1.2;
    const confidence = clamp(calendarListEntries / 8, 0.2, 0.6);
    return [withSignal(Dimension.Career, score, confidence, payload)];
  }

  const planningScore = scoreFromRatio(upcomingEvents, 10);
  const scheduleScore = scoreFromRatio(totalDurationHours, 22);
  const focusScore = timedEvents > 0 ? scoreFromRatio(focusKeywordHits, timedEvents / 2) : 0;
  const score = planningScore * 0.3 + scheduleScore * 0.45 + focusScore * 0.25;
  const confidence = clamp((timedEvents / 14) * 0.8 + 0.2, 0.25, 1);

  return [withSignal(Dimension.Career, score, confidence, payload)];
}

function mapSpotify(payload: unknown): NormalizedSignal[] {
  const record = toRecord(payload);
  const items = toArray(record?.items ?? payload);
  if (items.length === 0) return [];

  let totalMinutes = 0;
  let explicitTracks = 0;
  let popularityAccum = 0;
  let popularityCount = 0;
  const artistNames: Array<string | null | undefined> = [];

  for (const item of items) {
    const itemRecord = toRecord(item);
    if (!itemRecord) continue;

    const trackRecord = toRecord(itemRecord.track) ?? itemRecord;
    const durationMs = toFiniteNumber(trackRecord.duration_ms) ?? 0;
    const explicit = trackRecord.explicit === true;
    const popularity = toFiniteNumber(trackRecord.popularity);
    const artists = toArray(trackRecord.artists);

    totalMinutes += durationMs / (1000 * 60);
    if (explicit) explicitTracks += 1;
    if (popularity !== null) {
      popularityAccum += popularity;
      popularityCount += 1;
    }

    for (const artist of artists) {
      const artistRecord = toRecord(artist);
      artistNames.push(typeof artistRecord?.name === 'string' ? artistRecord.name : null);
    }
  }

  const artistDiversity = items.length > 0 ? uniqueCount(artistNames) / items.length : 0;
  const diversityScore = clamp(artistDiversity * 10, 0, 10);
  const explicitRatio = items.length > 0 ? explicitTracks / items.length : 0;
  const contentScore = clamp((1 - explicitRatio) * 10, 0, 10);
  const listeningScore = scoreFromRatio(totalMinutes, 150);
  const curationScore =
    popularityCount > 0 ? clamp((popularityAccum / popularityCount) / 10, 0, 10) : 5;

  const score =
    diversityScore * 0.35 + contentScore * 0.2 + listeningScore * 0.25 + curationScore * 0.2;
  const confidence = clamp((items.length / 50) * 0.9 + 0.1, 0.2, 1);

  return [withSignal(Dimension.Health, score, confidence, payload)];
}

function mapNotion(payload: unknown): NormalizedSignal[] {
  const record = toRecord(payload);
  const results = toArray(record?.results ?? payload);
  if (results.length === 0) return [];

  let pageCount = 0;
  let dbCount = 0;
  let recentlyEdited = 0;
  const now = Date.now();

  for (const item of results) {
    const itemRecord = toRecord(item);
    if (!itemRecord) continue;
    if (itemRecord.object === 'page') pageCount += 1;
    if (itemRecord.object === 'database') dbCount += 1;

    const editedTime =
      typeof itemRecord.last_edited_time === 'string'
        ? Date.parse(itemRecord.last_edited_time)
        : Number.NaN;
    if (!Number.isNaN(editedTime) && now - editedTime <= 7 * 24 * 60 * 60 * 1000) {
      recentlyEdited += 1;
    }
  }

  const activityScore = scoreFromRatio(pageCount, 30);
  const structureScore = scoreFromRatio(dbCount, 8);
  const recencyScore = scoreFromRatio(recentlyEdited, Math.max(1, pageCount / 2));
  const score = activityScore * 0.45 + structureScore * 0.2 + recencyScore * 0.35;
  const confidence = clamp(results.length / 40, 0.25, 1);

  return [withSignal(Dimension.Growth, score, confidence, payload)];
}

function mapSlack(payload: unknown): NormalizedSignal[] {
  const record = toRecord(payload);
  const channels = toArray(record?.channels ?? record?.data ?? payload);
  if (channels.length === 0) return [];

  let activeChannelCount = 0;
  let publicChannelCount = 0;
  let privateChannelCount = 0;

  for (const channel of channels) {
    const channelRecord = toRecord(channel);
    if (!channelRecord) continue;
    if (channelRecord.is_channel === true || channelRecord.is_group === true) {
      activeChannelCount += 1;
    }
    if (channelRecord.is_private === true) {
      privateChannelCount += 1;
    } else {
      publicChannelCount += 1;
    }
  }

  const collaborationScore = scoreFromRatio(activeChannelCount, 20);
  const networkBreadthScore = scoreFromRatio(publicChannelCount, 15);
  const focusedCoordinationScore = scoreFromRatio(privateChannelCount, 10);

  const careerScore =
    collaborationScore * 0.5 + networkBreadthScore * 0.25 + focusedCoordinationScore * 0.25;
  const socialScore =
    networkBreadthScore * 0.5 + collaborationScore * 0.3 + focusedCoordinationScore * 0.2;
  const confidence = clamp(channels.length / 30, 0.2, 1);

  return [
    withSignal(Dimension.Career, careerScore, confidence, payload),
    withSignal(Dimension.Social, socialScore, confidence, payload),
  ];
}

function mapFallback(dimension: Dimension, payload: unknown): NormalizedSignal[] {
  return [withSignal(dimension, 5, 0.2, payload)];
}

export function normalizeProviderPayload(
  provider: IntegrationProvider,
  payload: unknown,
  fallbackDimension?: Dimension,
): NormalizedSignal[] {
  const normalized = (() => {
    switch (provider) {
      case IntegrationProvider.AppleHealth:
        return mapAppleHealth(payload);
      case IntegrationProvider.Strava:
        return mapStrava(payload);
      case IntegrationProvider.GoogleCalendar:
        return mapGoogleCalendar(payload);
      case IntegrationProvider.Spotify:
        return mapSpotify(payload);
      case IntegrationProvider.Notion:
        return mapNotion(payload);
      case IntegrationProvider.Slack:
        return mapSlack(payload);
      default:
        return [];
    }
  })();

  if (normalized.length > 0) return normalized;
  if (!fallbackDimension) return [];
  return mapFallback(fallbackDimension, payload);
}

// ---------------------------------------------------------------------------
// Typed feature extraction for connectors
// ---------------------------------------------------------------------------

function makeFeat(
  feature: string,
  dimension: Dimension,
  value: number,
  source: string,
  confidence: number,
  recordedAt: Date,
): NormalisedFeature {
  return { feature, dimension, value, source, confidence, recordedAt };
}

export function extractStravaFeatures(activities: StravaActivity[]): NormalisedFeature[] {
  const features: NormalisedFeature[] = [];

  for (const a of activities) {
    const ts = a.startDate;
    features.push(makeFeat('distance_km', Dimension.Fitness, a.distanceMeters / 1000, 'strava', 1.0, ts));
    features.push(makeFeat('moving_time_min', Dimension.Fitness, a.movingTimeSeconds / 60, 'strava', 1.0, ts));
    if (a.averageHeartRate !== undefined) {
      features.push(makeFeat('avg_heart_rate', Dimension.Fitness, a.averageHeartRate, 'strava', 1.0, ts));
    }
    if (a.sufferedScore !== undefined) {
      features.push(makeFeat('suffer_score', Dimension.Fitness, a.sufferedScore, 'strava', 0.8, ts));
    }
  }

  return features;
}

export function extractCalendarFeatures(events: CalendarEvent[]): NormalisedFeature[] {
  const features: NormalisedFeature[] = [];
  let meetingMinutes = 0;
  let focusMinutes = 0;
  let eventCount = 0;
  const day = events.length > 0 ? events[0].start : new Date();

  for (const e of events) {
    const durationMin = Math.max(0, (e.end.getTime() - e.start.getTime()) / 60_000);
    eventCount++;

    const title = e.summary.toLowerCase();
    const isFocus = title.includes('focus') || title.includes('deep work') || title.includes('study');
    const isMeeting = (e.attendees ?? 0) >= 2;

    if (isMeeting) meetingMinutes += durationMin;
    else if (isFocus) focusMinutes += durationMin;
  }

  features.push(makeFeat('event_count', Dimension.Career, eventCount, 'google_calendar', 1.0, day));
  features.push(makeFeat('meeting_minutes', Dimension.Career, meetingMinutes, 'google_calendar', 1.0, day));
  features.push(makeFeat('focus_minutes', Dimension.Career, focusMinutes, 'google_calendar', 0.8, day));

  return features;
}

