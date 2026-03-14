/**
 * connectors/apple-health.ts
 *
 * Apple Health / HealthKit integration for the Life Design platform.
 *
 * Four entry-points are provided:
 *  1. `requestHealthKitPermissions` — iOS native permission negotiation.
 *  2. `syncHealthKitData`           — Pull recent data, aggregate to daily, extract features.
 *  3. `setupBackgroundSync`         — Register background delivery with 1-sync-per-hour debounce.
 *  4. `parseAppleHealthExport`      — Parse the Apple Health XML export file in pure TypeScript.
 *
 * Platform notes:
 *  - HealthKit APIs are guarded behind a dynamic import of expo-health. If the
 *    module is absent (web or unsupported environment) the functions throw a clear
 *    error rather than crashing at module load time.
 *  - The XML parser is dependency-free and regex-based, suitable for large files.
 *
 * @module
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { Dimension } from '../enums';
import type { NormalisedFeature } from '../feature-extraction';

// ─────────────────────────────────────────────────────────────────────────────
// Core data types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Raw biometric snapshot from Apple Health for a single day.
 * All numeric fields are optional; only fields present in the data source are
 * populated. `recordedAt` marks the end of the day the data was recorded.
 */
export interface AppleHealthData {
  /** Resting heart rate in beats per minute. */
  restingHeartRate?: number;
  /** Heart Rate Variability (SDNN) in milliseconds. */
  hrvMs?: number;
  /** Total sleep duration in hours. */
  sleepHours?: number;
  /** Duration (minutes) spent in each sleep stage. */
  sleepStages?: { deep: number; rem: number; light: number; awake: number };
  /** Total step count for the day. */
  steps?: number;
  /** Active energy burned in kilocalories. */
  activeEnergyKcal?: number;
  /** Respiratory rate in breaths per minute. */
  respiratoryRate?: number;
  /** Blood oxygen saturation percentage (0–100). */
  bloodOxygen?: number;
  /** Timestamp representing when this data was recorded. */
  recordedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a NormalisedFeature with all required fields.
 */
function feat(
  feature: string,
  dimension: Dimension,
  value: number,
  confidence: number,
  recordedAt: Date,
): NormalisedFeature {
  return { feature, dimension, value, source: 'apple_health', confidence, recordedAt };
}

/**
 * Extracts biometric and activity features from an Apple Health daily snapshot.
 *
 * Features produced (when data is present):
 *  - resting_hr       (Health,  1.0) — resting heart rate in bpm
 *  - hrv_ms           (Health,  1.0) — heart rate variability (SDNN) in ms
 *  - sleep_hours      (Growth,  1.0) — total sleep in hours
 *  - sleep_quality    (Growth,  0.8) — (deep + rem) / total sleep minutes
 *  - steps            (Fitness, 1.0) — daily step count
 *  - active_energy    (Fitness, 1.0) — active energy in kcal
 *  - respiratory_rate (Health,  1.0) — respiratory rate in breaths/min
 *  - blood_oxygen     (Health,  1.0) — SpO2 percentage
 *
 * @param rawData - A single-day Apple Health snapshot.
 * @returns Array of NormalisedFeature objects, one per populated field.
 */
export function extractAppleHealthFeatures(rawData: AppleHealthData): NormalisedFeature[] {
  const features: NormalisedFeature[] = [];
  const ts = rawData.recordedAt;

  if (rawData.restingHeartRate !== undefined) {
    features.push(feat('resting_hr', Dimension.Health, rawData.restingHeartRate, 1.0, ts));
  }
  if (rawData.hrvMs !== undefined) {
    features.push(feat('hrv_ms', Dimension.Health, rawData.hrvMs, 1.0, ts));
  }
  if (rawData.sleepHours !== undefined) {
    features.push(feat('sleep_hours', Dimension.Growth, rawData.sleepHours, 1.0, ts));
  }
  if (rawData.sleepStages !== undefined) {
    const { deep, rem, light, awake } = rawData.sleepStages;
    const totalMinutes = deep + rem + light + awake;
    const sleepQuality = totalMinutes > 0 ? (deep + rem) / totalMinutes : 0;
    features.push(feat('sleep_quality', Dimension.Growth, sleepQuality, 0.8, ts));
  }
  if (rawData.steps !== undefined) {
    features.push(feat('steps', Dimension.Fitness, rawData.steps, 1.0, ts));
  }
  if (rawData.activeEnergyKcal !== undefined) {
    features.push(feat('active_energy', Dimension.Fitness, rawData.activeEnergyKcal, 1.0, ts));
  }
  if (rawData.respiratoryRate !== undefined) {
    features.push(feat('respiratory_rate', Dimension.Health, rawData.respiratoryRate, 1.0, ts));
  }
  if (rawData.bloodOxygen !== undefined) {
    features.push(feat('blood_oxygen', Dimension.Health, rawData.bloodOxygen, 1.0, ts));
  }

  return features;
}

/**
 * Upserts a batch of normalised features into the `feature_store` Supabase table.
 *
 * The upsert key is `(user_id, feature, recorded_at)` — re-ingesting the same
 * snapshot will update existing rows rather than creating duplicates.
 *
 * @param supabase  - An authenticated Supabase client instance.
 * @param userId    - The UUID of the user whose features are being stored.
 * @param features  - The normalised features to persist (may be empty; no-ops cleanly).
 * @throws          If the Supabase upsert returns an error.
 */
export async function storeFeatures(
  supabase: SupabaseClient,
  userId: string,
  features: NormalisedFeature[],
): Promise<void> {
  if (features.length === 0) return;

  const rows = features.map((f) => ({
    user_id: userId,
    feature: f.feature,
    dimension: f.dimension,
    value: f.value,
    source: f.source,
    confidence: f.confidence,
    recorded_at: f.recordedAt.toISOString(),
  }));

  const { error } = await supabase
    .from('feature_store')
    .upsert(rows, { onConflict: 'user_id,feature,recorded_at' });

  if (error) {
    throw new Error(`storeFeatures: Supabase upsert failed — ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public HealthKit types
// ─────────────────────────────────────────────────────────────────────────────

/** All HealthKit data type identifiers that Life Design requests read access to. */
export type HealthKitDataType =
  | 'HKQuantityTypeIdentifierRestingHeartRate'
  | 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN'
  | 'HKCategoryTypeIdentifierSleepAnalysis'
  | 'HKQuantityTypeIdentifierStepCount'
  | 'HKQuantityTypeIdentifierActiveEnergyBurned'
  | 'HKQuantityTypeIdentifierRespiratoryRate'
  | 'HKQuantityTypeIdentifierOxygenSaturation';

/**
 * Configuration passed to `requestHealthKitPermissions`.
 * Write access is intentionally empty — Life Design is read-only.
 */
export interface HealthKitConfig {
  permissions: {
    read: HealthKitDataType[];
    /** Life Design never writes health data. */
    write: never[];
  };
  backgroundDelivery: boolean;
  updateFrequency: 'immediate' | 'hourly' | 'daily';
}

/** Result returned by `syncHealthKitData`. */
export interface HealthKitSyncResult {
  /** Number of raw HealthKit records consumed. */
  recordsProcessed: number;
  /** Normalised features ready for `storeFeatures`. */
  features: NormalisedFeature[];
  /** Timestamp of the most recent record processed. */
  lastSyncedAt: Date;
  /** Per-data-type errors that occurred during the sync (non-fatal). */
  errors: Array<{ dataType: string; error: string }>;
}

/**
 * Represents a parsed Apple Health XML export.
 * Returned by `parseAppleHealthExport`.
 */
export interface AppleHealthExport {
  /** The date the export file was created, taken from the ExportDate element. */
  exportDate: Date;
  /** All matching records extracted from the XML. */
  records: Array<{
    /** HealthKit type identifier, e.g. HKQuantityTypeIdentifierStepCount. */
    type: string;
    /** Numeric value of the record. */
    value: number;
    /** Unit string as exported by Apple Health, e.g. count/min. */
    unit: string;
    /** Start of the measurement interval. */
    startDate: Date;
    /** End of the measurement interval. */
    endDate: Date;
    /** Name of the recording device or app. */
    sourceName: string;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal constants
// ─────────────────────────────────────────────────────────────────────────────

/** The complete set of HealthKit types Life Design reads. */
export const DEFAULT_READ_TYPES: HealthKitDataType[] = [
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierRespiratoryRate',
  'HKQuantityTypeIdentifierOxygenSaturation',
];

/** Mapping from HealthKit type to AppleHealthData field name. */
const TYPE_TO_FIELD: Record<HealthKitDataType, keyof Omit<AppleHealthData, 'recordedAt'>> = {
  HKQuantityTypeIdentifierRestingHeartRate: 'restingHeartRate',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrvMs',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleepHours',
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'activeEnergyKcal',
  HKQuantityTypeIdentifierRespiratoryRate: 'respiratoryRate',
  HKQuantityTypeIdentifierOxygenSaturation: 'bloodOxygen',
};

/**
 * HealthKit record types that Life Design recognises in the XML export.
 * Stored as a Set for O(1) membership tests against large exports.
 */
const RECOGNISED_TYPES = new Set<string>([
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierRespiratoryRate',
  'HKQuantityTypeIdentifierOxygenSaturation',
]);

/** Maximum gap between two background sync invocations in milliseconds. */
const BACKGROUND_SYNC_DEBOUNCE_MS = 60 * 60 * 1_000; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────
// Platform guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects whether the current runtime is an iOS/iPadOS native environment.
 * Uses the Platform export from react-native when available; falls back to
 * a user-agent heuristic for environments where React Native is not loaded.
 */
async function isIOS(): Promise<boolean> {
  try {
    // Dynamic import so the module load does not fail on web.
    const rn = await import('react-native' as string);
    return (rn as { Platform?: { OS?: string } }).Platform?.OS === 'ios';
  } catch {
    // Web or non-RN environment.
    if (typeof navigator !== 'undefined') {
      return /iP(hone|ad|od)/.test(navigator.userAgent);
    }
    return false;
  }
}

/**
 * Attempts to load expo-health dynamically.
 *
 * @throws {Error} When the module cannot be resolved (not installed or not on iOS).
 */
async function loadExpoHealth(): Promise<Record<string, unknown>> {
  try {
    const mod = await import('expo-health' as string);
    return mod as Record<string, unknown>;
  } catch (cause) {
    throw new Error(
      'expo-health is not available in this environment. ' +
        'HealthKit APIs require iOS with expo-health installed. ' +
        `Original error: ${(cause as Error).message}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission request
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests HealthKit read permissions from the user on iOS.
 *
 * Throws a descriptive error when called on web or Android — callers should
 * check the platform before calling this function.
 *
 * @param config - The requested data types and delivery configuration.
 * @returns `'granted'` if the user approved all requested types, `'denied'` otherwise.
 * @throws {Error} If not running on iOS, or if expo-health is not installed.
 *
 * @example
 * ```ts
 * const status = await requestHealthKitPermissions({
 *   permissions: { read: DEFAULT_READ_TYPES, write: [] },
 *   backgroundDelivery: true,
 *   updateFrequency: 'hourly',
 * });
 * if (status === 'denied') showPermissionRationale();
 * ```
 */
export async function requestHealthKitPermissions(
  config: HealthKitConfig,
): Promise<'granted' | 'denied'> {
  const ios = await isIOS();
  if (!ios) {
    throw new Error(
      'requestHealthKitPermissions: HealthKit is only available on iOS. ' +
        'This function must not be called on web or Android.',
    );
  }

  const Health = await loadExpoHealth();

  // expo-health exposes requestPermissionsAsync with a typed permissions object.
  const requestFn = Health['requestPermissionsAsync'] as (opts: {
    read: string[];
    write: string[];
  }) => Promise<{ granted: boolean }>;

  if (typeof requestFn !== 'function') {
    throw new Error(
      'expo-health does not export requestPermissionsAsync. ' +
        'Ensure expo-health version matches the expected API.',
    );
  }

  const result = await requestFn({
    read: config.permissions.read,
    write: [],
  });

  return result.granted ? 'granted' : 'denied';
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily aggregation helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single raw HealthKit sample as returned by expo-health query APIs.
 * Only the fields Life Design uses are declared; additional fields are ignored.
 */
export interface RawHealthKitSample {
  value: number;
  startDate: string | Date;
  endDate: string | Date;
  unit?: string;
}

/**
 * Groups an array of raw samples by calendar date (ISO YYYY-MM-DD).
 *
 * @param samples - Raw HealthKit samples to group.
 * @returns       Map from ISO date string to samples array.
 */
export function groupByDay(samples: RawHealthKitSample[]): Map<string, RawHealthKitSample[]> {
  const map = new Map<string, RawHealthKitSample[]>();
  for (const s of samples) {
    const d = new Date(s.startDate);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

/**
 * Aggregates raw samples for a single HealthKit data type into one value per day.
 *
 * Aggregation strategy by type:
 *  - StepCount, ActiveEnergyBurned — daily sum (cumulative metrics).
 *  - SleepAnalysis                 — daily sum of durations in hours (derived from start/end).
 *  - All other types               — daily mean (point-in-time measurements).
 *
 * @param type    - HealthKit type identifier.
 * @param samples - Raw samples for that type.
 * @returns Map from ISO date string to aggregated value.
 */
export function aggregateDailyValues(
  type: HealthKitDataType,
  samples: RawHealthKitSample[],
): Map<string, number> {
  const byDay = groupByDay(samples);
  const result = new Map<string, number>();

  const isSumType =
    type === 'HKQuantityTypeIdentifierStepCount' ||
    type === 'HKQuantityTypeIdentifierActiveEnergyBurned' ||
    type === 'HKCategoryTypeIdentifierSleepAnalysis';

  for (const [day, daySamples] of byDay) {
    if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      // Sleep analysis: each sample has a start and end — compute duration in hours.
      let totalHours = 0;
      for (const s of daySamples) {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        totalHours += Math.max(0, end - start) / 3_600_000;
      }
      result.set(day, totalHours);
    } else if (isSumType) {
      result.set(
        day,
        daySamples.reduce((acc, s) => acc + s.value, 0),
      );
    } else {
      // Mean for point-in-time measurements (HR, HRV, SpO2, respiratory rate).
      const sum = daySamples.reduce((acc, s) => acc + s.value, 0);
      result.set(day, sum / daySamples.length);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthKit sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queries HealthKit for all requested data types over the given date range,
 * aggregates values to daily granularity, and runs `extractAppleHealthFeatures`
 * on each day's snapshot.
 *
 * @param startDate - Inclusive start of the query window.
 * @param endDate   - Inclusive end of the query window.
 * @param dataTypes - HealthKit type identifiers to query. Defaults to all supported types.
 * @returns A HealthKitSyncResult containing extracted features and metadata.
 * @throws {Error} If not running on iOS, or if expo-health is not installed.
 *
 * @example
 * ```ts
 * const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
 * const result = await syncHealthKitData(sevenDaysAgo, new Date(), DEFAULT_READ_TYPES);
 * await storeFeatures(supabase, userId, result.features);
 * ```
 */
export async function syncHealthKitData(
  startDate: Date,
  endDate: Date,
  dataTypes: HealthKitDataType[] = DEFAULT_READ_TYPES,
): Promise<HealthKitSyncResult> {
  const ios = await isIOS();
  if (!ios) {
    throw new Error(
      'syncHealthKitData: HealthKit is only available on iOS. ' +
        'Use parseAppleHealthExport for web-based imports.',
    );
  }

  const Health = await loadExpoHealth();

  // expo-health query function signature (simplified).
  const queryFn = Health['querySamplesAsync'] as (opts: {
    type: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }) => Promise<RawHealthKitSample[]>;

  if (typeof queryFn !== 'function') {
    throw new Error(
      'expo-health does not export querySamplesAsync. ' +
        'Ensure the installed version matches the expected API.',
    );
  }

  // Accumulate daily aggregated values across all types.
  // Structure: Map<ISO-date, Partial<AppleHealthData>>
  const dailyData = new Map<string, Partial<Omit<AppleHealthData, 'recordedAt'>>>();

  let totalRecordsProcessed = 0;
  const errors: Array<{ dataType: string; error: string }> = [];

  for (const type of dataTypes) {
    try {
      const samples = await queryFn({ type, startDate, endDate });
      totalRecordsProcessed += samples.length;

      const field = TYPE_TO_FIELD[type];
      if (!field) continue;

      const dailyValues = aggregateDailyValues(type, samples);

      for (const [day, value] of dailyValues) {
        if (!dailyData.has(day)) dailyData.set(day, {});
        // Blood oxygen is a percentage (0-100); HealthKit may return 0-1.
        // Normalise to 0-100 range for consistency with AppleHealthData.
        const normalisedValue =
          type === 'HKQuantityTypeIdentifierOxygenSaturation' && value <= 1
            ? value * 100
            : value;
        (dailyData.get(day) as Record<string, number>)[field] = normalisedValue;
      }
    } catch (err) {
      errors.push({ dataType: type, error: (err as Error).message });
    }
  }

  // Build per-day AppleHealthData snapshots and extract features.
  const allFeatures: NormalisedFeature[] = [];
  const sortedDays = Array.from(dailyData.keys()).sort();
  let lastSyncedAt = startDate;

  for (const day of sortedDays) {
    const snapshot = dailyData.get(day)!;
    const recordedAt = new Date(`${day}T23:59:59.000Z`);
    if (recordedAt > lastSyncedAt) lastSyncedAt = recordedAt;

    const healthData: AppleHealthData = {
      ...snapshot,
      recordedAt,
    };

    const features = extractAppleHealthFeatures(healthData);
    allFeatures.push(...features);
  }

  return {
    recordsProcessed: totalRecordsProcessed,
    features: allFeatures,
    lastSyncedAt,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Background sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-user timestamp of the last background sync, used for debouncing.
 * Keyed by userId so multiple users on the same device are independent.
 */
const lastSyncTimestamps = new Map<string, number>();

/**
 * Registers for HealthKit background delivery and schedules a recurring sync.
 * Calls are debounced: at most one sync per hour per user regardless of how
 * frequently the OS delivers background updates.
 *
 * The sync window always covers the 24 hours preceding the current time.
 *
 * @param userId   - UUID of the authenticated user; used as the debounce key.
 * @param supabase - Authenticated Supabase client for persisting features.
 * @returns A cleanup function that cancels the background observer.
 * @throws {Error} If not running on iOS, or if expo-health is not installed.
 *
 * @example
 * ```ts
 * // In a React Native component or useEffect:
 * const cleanup = await setupBackgroundSync(user.id, supabase);
 * return cleanup; // call on unmount
 * ```
 */
export async function setupBackgroundSync(
  userId: string,
  supabase: SupabaseClient,
): Promise<() => void> {
  const ios = await isIOS();
  if (!ios) {
    throw new Error(
      'setupBackgroundSync: HealthKit background delivery requires iOS.',
    );
  }

  const Health = await loadExpoHealth();

  const enableBgFn = Health['enableBackgroundDeliveryAsync'] as (opts: {
    type: string;
    updateFrequency: number;
  }) => Promise<void>;

  const observeFn = Health['observeChangesAsync'] as (
    type: string,
    callback: () => void,
  ) => Promise<{ remove: () => void }>;

  if (typeof enableBgFn !== 'function' || typeof observeFn !== 'function') {
    throw new Error(
      'expo-health does not export enableBackgroundDeliveryAsync or observeChangesAsync.',
    );
  }

  // Enable background delivery for each data type.
  // expo-health update frequency constants: 0=immediate, 1=hourly, 2=daily, 3=weekly.
  await Promise.all(
    DEFAULT_READ_TYPES.map((type) =>
      enableBgFn({ type, updateFrequency: 1 /* hourly */ }).catch(() => {
        // Non-fatal: some types may not support background delivery.
      }),
    ),
  );

  /**
   * Debounced sync handler — ensures at most one full sync per hour.
   * Any background delivery that arrives within the debounce window is silently
   * dropped; the data will be captured on the next scheduled sync.
   */
  async function handleBackgroundDelivery(): Promise<void> {
    const now = Date.now();
    const lastSync = lastSyncTimestamps.get(userId) ?? 0;

    if (now - lastSync < BACKGROUND_SYNC_DEBOUNCE_MS) {
      // Still within the debounce window — skip.
      return;
    }

    lastSyncTimestamps.set(userId, now);

    try {
      const endDate = new Date(now);
      const startDate = new Date(now - 24 * 3_600_000); // last 24 hours

      const result = await syncHealthKitData(startDate, endDate, DEFAULT_READ_TYPES);

      if (result.features.length > 0) {
        await storeFeatures(supabase, userId, result.features);
      }
    } catch {
      // Background errors are swallowed to prevent crashing the app.
      // The next delivery attempt will retry automatically.
    }
  }

  // Register observers for all types. Collect remove handles for cleanup.
  const observers = await Promise.all(
    DEFAULT_READ_TYPES.map((type) =>
      observeFn(type, () => {
        void handleBackgroundDelivery();
      }),
    ),
  );

  return () => {
    for (const obs of observers) {
      try {
        obs.remove();
      } catch {
        // Ignore errors on cleanup.
      }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Apple Health XML export parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses an Apple Health XML export file using pure TypeScript regex-based
 * parsing — no DOM, no external XML libraries.
 *
 * Apple Health exports produce an export.xml with the structure:
 * ```xml
 * <HealthData locale="en_AU">
 *   <ExportDate value="2025-01-15 10:00:00 +0000"/>
 *   <Record type="HKQuantityTypeIdentifierStepCount"
 *           sourceName="iPhone"
 *           unit="count"
 *           startDate="2025-01-14 00:00:00 +0000"
 *           endDate="2025-01-14 23:59:59 +0000"
 *           value="12000"/>
 *   <Record type="HKCategoryTypeIdentifierSleepAnalysis"
 *           sourceName="Sleep Cycle"
 *           value="HKCategoryValueSleepAnalysisAsleep"
 *           startDate="2025-01-13 22:30:00 +0000"
 *           endDate="2025-01-14 06:00:00 +0000"/>
 * </HealthData>
 * ```
 *
 * Important: Sleep analysis records use a category string as their value
 * attribute (not a number). The parser handles this by deriving a presence
 * marker of 1, with the actual duration computed from start/end timestamps.
 *
 * Only record types in DEFAULT_READ_TYPES are extracted; all others are
 * silently skipped to keep memory usage low for large exports.
 *
 * @param xmlString - The full content of export.xml as a UTF-8 string.
 * @returns         A parsed AppleHealthExport object.
 * @throws {Error}  If the XML string is empty.
 *
 * @example
 * ```ts
 * const xml = await readFile('export.xml', 'utf8');
 * const data = parseAppleHealthExport(xml);
 * console.log(`Found ${data.records.length} records`);
 * ```
 */
export function parseAppleHealthExport(xmlString: string): AppleHealthExport {
  if (!xmlString || xmlString.trim().length === 0) {
    throw new Error('parseAppleHealthExport: XML string must not be empty.');
  }

  // ── Extract export date ───────────────────────────────────────────────────
  const exportDateMatch = xmlString.match(/<ExportDate[^>]+value="([^"]+)"/);
  const exportDate = exportDateMatch
    ? parseAppleHealthDate(exportDateMatch[1])
    : new Date(0);

  // ── Extract records ───────────────────────────────────────────────────────
  // Matches self-closing <Record .../> or non-self-closing <Record ...> elements.
  const records: AppleHealthExport['records'] = [];
  const recordPattern = /<Record\s([^>]*?)\s*\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = recordPattern.exec(xmlString)) !== null) {
    const attrs = match[1];

    // Fast-path: skip records with unrecognised types.
    const typeMatch = attrs.match(/\btype="([^"]+)"/);
    if (!typeMatch) continue;
    const type = typeMatch[1];
    if (!RECOGNISED_TYPES.has(type)) continue;

    const unit = extractAttr(attrs, 'unit') ?? '';
    const sourceName = extractAttr(attrs, 'sourceName') ?? '';
    const startDateStr = extractAttr(attrs, 'startDate');
    const endDateStr = extractAttr(attrs, 'endDate');

    if (!startDateStr || !endDateStr) continue;

    // Sleep analysis records use a category string as value (e.g.
    // "HKCategoryValueSleepAnalysisAsleep"). The real information is the
    // duration between startDate and endDate, so we store a presence marker of
    // 1. The aggregator in aggregateDailyValues computes real hours from
    // start/end timestamps.
    let value: number;
    if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      value = 1; // presence marker; actual duration from start/end
    } else {
      const numericValue = extractAttrNumber(attrs, 'value');
      if (numericValue === null) continue; // skip records without a numeric value
      value = numericValue;
    }

    const startDate = parseAppleHealthDate(startDateStr);
    const endDate = parseAppleHealthDate(endDateStr);

    records.push({ type, value, unit, startDate, endDate, sourceName });
  }

  return { exportDate, records };
}

// ─────────────────────────────────────────────────────────────────────────────
// XML attribute helpers (private)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts the string value of a named XML attribute from a raw attribute string.
 *
 * @param attrs - Raw attribute string.
 * @param name  - Attribute name to look up.
 * @returns The attribute value, or null if not found.
 */
function extractAttr(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}="([^"]*)"`);
  const m = attrs.match(re);
  return m ? m[1] : null;
}

/**
 * Extracts a numeric XML attribute value.
 *
 * @param attrs - Raw attribute string.
 * @param name  - Attribute name to look up.
 * @returns The parsed number, or null if missing or non-numeric.
 */
function extractAttrNumber(attrs: string, name: string): number | null {
  const raw = extractAttr(attrs, name);
  if (raw === null) return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

/**
 * Parses an Apple Health date string into a JavaScript Date.
 *
 * Apple Health uses the format "2025-01-14 23:59:59 +0000".
 * The date separator space and timezone offset space are normalised to produce
 * an ISO 8601 string accepted by Date.parse.
 *
 * @param raw - Apple Health date string.
 * @returns   A Date object, or new Date(0) for unparseable strings.
 */
export function parseAppleHealthDate(raw: string): Date {
  // "2025-01-14 23:59:59 +0000" -> "2025-01-14T23:59:59+0000"
  const normalised = raw
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{4})$/, '$1T$2$3');

  const ts = Date.parse(normalised);
  return isNaN(ts) ? new Date(0) : new Date(ts);
}
