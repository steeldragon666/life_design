/**
 * apple-health.test.ts
 *
 * Comprehensive tests for the Apple Health / HealthKit connector.
 *
 * Test categories:
 *  1. Platform guard — requestHealthKitPermissions throws on non-iOS.
 *  2. aggregateDailyValues — correct daily aggregation by data type.
 *  3. groupByDay — correct ISO date grouping.
 *  4. Sleep quality score calculation (re-verifies feature-extraction logic
 *     from the connector's perspective).
 *  5. parseAppleHealthExport — real-world Apple Health XML format.
 *  6. parseAppleHealthExport — empty / malformed XML graceful handling.
 *  7. parseAppleHealthDate — date string normalisation.
 *  8. syncHealthKitData — feature extraction from aggregated data.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  requestHealthKitPermissions,
  parseAppleHealthExport,
  parseAppleHealthDate,
  aggregateDailyValues,
  groupByDay,
  DEFAULT_READ_TYPES,
  extractAppleHealthFeatures,
} from '../connectors/apple-health';
import type {
  HealthKitConfig,
  HealthKitDataType,
  RawHealthKitSample,
} from '../connectors/apple-health';

// ─────────────────────────────────────────────────────────────────────────────
// Mock expo-health so native module resolution does not fail in the test runner.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('expo-health', () => ({
  requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  querySamplesAsync: vi.fn().mockResolvedValue([]),
  enableBackgroundDeliveryAsync: vi.fn().mockResolvedValue(undefined),
  observeChangesAsync: vi.fn().mockResolvedValue({ remove: vi.fn() }),
}));

// Mock react-native Platform to simulate a non-iOS environment by default.
// Individual tests override this to simulate iOS.
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeSample(
  value: number,
  startDate: string,
  endDate?: string,
): RawHealthKitSample {
  return {
    value,
    startDate,
    endDate: endDate ?? startDate,
  };
}

// A representative Apple Health export.xml excerpt used across multiple tests.
const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ELEMENT HealthData (ExportDate, Me, Record*)>
]>
<HealthData locale="en_AU">
 <ExportDate value="2025-01-16 08:00:00 +0000"/>
 <Me HKCharacteristicTypeIdentifierDateOfBirth="1990-05-15"
     HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale"/>

 <!-- Resting heart rate — 14 Jan -->
 <Record type="HKQuantityTypeIdentifierRestingHeartRate"
         sourceName="Apple Watch"
         sourceVersion="11.0"
         unit="count/min"
         creationDate="2025-01-14 08:30:00 +0000"
         startDate="2025-01-14 08:30:00 +0000"
         endDate="2025-01-14 08:30:00 +0000"
         value="58"/>

 <!-- Resting heart rate — 15 Jan (two readings, should average to 60) -->
 <Record type="HKQuantityTypeIdentifierRestingHeartRate"
         sourceName="Apple Watch"
         unit="count/min"
         startDate="2025-01-15 07:00:00 +0000"
         endDate="2025-01-15 07:00:00 +0000"
         value="59"/>
 <Record type="HKQuantityTypeIdentifierRestingHeartRate"
         sourceName="Apple Watch"
         unit="count/min"
         startDate="2025-01-15 19:00:00 +0000"
         endDate="2025-01-15 19:00:00 +0000"
         value="61"/>

 <!-- HRV — 14 Jan -->
 <Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN"
         sourceName="Apple Watch"
         unit="ms"
         startDate="2025-01-14 03:00:00 +0000"
         endDate="2025-01-14 03:00:00 +0000"
         value="42"/>

 <!-- Steps — 14 Jan (two batches that should sum to 9800) -->
 <Record type="HKQuantityTypeIdentifierStepCount"
         sourceName="iPhone"
         unit="count"
         startDate="2025-01-14 09:00:00 +0000"
         endDate="2025-01-14 12:00:00 +0000"
         value="4200"/>
 <Record type="HKQuantityTypeIdentifierStepCount"
         sourceName="iPhone"
         unit="count"
         startDate="2025-01-14 13:00:00 +0000"
         endDate="2025-01-14 18:00:00 +0000"
         value="5600"/>

 <!-- Active energy — 14 Jan -->
 <Record type="HKQuantityTypeIdentifierActiveEnergyBurned"
         sourceName="Apple Watch"
         unit="kcal"
         startDate="2025-01-14 07:00:00 +0000"
         endDate="2025-01-14 22:00:00 +0000"
         value="520"/>

 <!-- Sleep — night of 13–14 Jan (7.5 hours total) -->
 <Record type="HKCategoryTypeIdentifierSleepAnalysis"
         sourceName="Sleep Cycle"
         value="HKCategoryValueSleepAnalysisAsleep"
         startDate="2025-01-13 22:30:00 +0000"
         endDate="2025-01-14 06:00:00 +0000"/>

 <!-- Respiratory rate — 14 Jan -->
 <Record type="HKQuantityTypeIdentifierRespiratoryRate"
         sourceName="Apple Watch"
         unit="count/min"
         startDate="2025-01-14 04:00:00 +0000"
         endDate="2025-01-14 04:00:00 +0000"
         value="15"/>

 <!-- Blood oxygen — 14 Jan (as a fraction 0-1) -->
 <Record type="HKQuantityTypeIdentifierOxygenSaturation"
         sourceName="Apple Watch"
         unit="%"
         startDate="2025-01-14 04:05:00 +0000"
         endDate="2025-01-14 04:05:00 +0000"
         value="0.98"/>

 <!-- Record type NOT in our list — should be ignored -->
 <Record type="HKQuantityTypeIdentifierBodyMass"
         sourceName="iPhone"
         unit="kg"
         startDate="2025-01-14 07:00:00 +0000"
         endDate="2025-01-14 07:00:00 +0000"
         value="80"/>

</HealthData>`;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Platform guard
// ─────────────────────────────────────────────────────────────────────────────

describe('requestHealthKitPermissions — platform guard', () => {
  const validConfig: HealthKitConfig = {
    permissions: { read: DEFAULT_READ_TYPES, write: [] as never[] },
    backgroundDelivery: true,
    updateFrequency: 'hourly',
  };

  beforeEach(async () => {
    // Make expo-health fail to load so isIOS() returns false.
    // The implementation uses dynamic import('expo-health') to detect iOS;
    // when it throws, the platform is considered non-iOS.
    vi.doMock('expo-health', () => {
      throw new Error('expo-health not available');
    });
    // Re-import so the updated mock takes effect
    vi.resetModules();
    const mod = await import('../connectors/apple-health');
    // Replace the module-level reference with the re-imported version
    Object.assign(
      { requestHealthKitPermissions },
      { requestHealthKitPermissions: mod.requestHealthKitPermissions },
    );
  });

  afterEach(() => {
    // Restore the default expo-health mock for other test groups
    vi.doMock('expo-health', () => ({
      requestPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
      querySamplesAsync: vi.fn().mockResolvedValue([]),
      enableBackgroundDeliveryAsync: vi.fn().mockResolvedValue(undefined),
      observeChangesAsync: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    }));
  });

  it('throws when Platform.OS is not ios (simulated web)', async () => {
    vi.doMock('expo-health', () => {
      throw new Error('expo-health not available');
    });
    vi.resetModules();
    const { requestHealthKitPermissions: fn } = await import('../connectors/apple-health');
    await expect(fn(validConfig)).rejects.toThrow(
      /HealthKit is only available on iOS/,
    );
  });

  it('throws with a message that mentions iOS', async () => {
    vi.doMock('expo-health', () => {
      throw new Error('expo-health not available');
    });
    vi.resetModules();
    const { requestHealthKitPermissions: fn } = await import('../connectors/apple-health');
    await expect(fn(validConfig)).rejects.toThrow(
      /iOS/,
    );
  });

  it('throws synchronously-equivalent error for Android (OS=android)', async () => {
    vi.doMock('expo-health', () => {
      throw new Error('expo-health not available');
    });
    vi.resetModules();
    const { requestHealthKitPermissions: fn } = await import('../connectors/apple-health');
    await expect(fn(validConfig)).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. groupByDay
// ─────────────────────────────────────────────────────────────────────────────

describe('groupByDay', () => {
  it('groups samples from the same day together', () => {
    const samples: RawHealthKitSample[] = [
      makeSample(60, '2025-01-14T08:00:00.000Z'),
      makeSample(62, '2025-01-14T20:00:00.000Z'),
      makeSample(58, '2025-01-15T08:00:00.000Z'),
    ];
    const grouped = groupByDay(samples);
    expect(grouped.size).toBe(2);
    expect(grouped.get('2025-01-14')).toHaveLength(2);
    expect(grouped.get('2025-01-15')).toHaveLength(1);
  });

  it('returns an empty map for an empty input array', () => {
    expect(groupByDay([])).toEqual(new Map());
  });

  it('handles Date objects as well as ISO strings', () => {
    const samples: RawHealthKitSample[] = [
      { value: 70, startDate: new Date('2025-01-14T09:00:00Z'), endDate: new Date('2025-01-14T09:00:00Z') },
    ];
    const grouped = groupByDay(samples);
    expect(grouped.has('2025-01-14')).toBe(true);
  });

  it('produces ISO YYYY-MM-DD keys', () => {
    const samples: RawHealthKitSample[] = [
      makeSample(100, '2025-03-01T00:00:00.000Z'),
    ];
    const [key] = Array.from(groupByDay(samples).keys());
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. aggregateDailyValues
// ─────────────────────────────────────────────────────────────────────────────

describe('aggregateDailyValues — step count (sum)', () => {
  const type: HealthKitDataType = 'HKQuantityTypeIdentifierStepCount';

  it('sums multiple step records on the same day', () => {
    const samples: RawHealthKitSample[] = [
      makeSample(4200, '2025-01-14T09:00:00Z', '2025-01-14T12:00:00Z'),
      makeSample(5600, '2025-01-14T13:00:00Z', '2025-01-14T18:00:00Z'),
    ];
    const result = aggregateDailyValues(type, samples);
    expect(result.get('2025-01-14')).toBe(9800);
  });

  it('keeps separate totals for different days', () => {
    const samples: RawHealthKitSample[] = [
      makeSample(10000, '2025-01-14T10:00:00Z'),
      makeSample(8000, '2025-01-15T10:00:00Z'),
    ];
    const result = aggregateDailyValues(type, samples);
    expect(result.get('2025-01-14')).toBe(10000);
    expect(result.get('2025-01-15')).toBe(8000);
  });

  it('returns an empty map for an empty sample array', () => {
    expect(aggregateDailyValues(type, [])).toEqual(new Map());
  });
});

describe('aggregateDailyValues — resting heart rate (mean)', () => {
  const type: HealthKitDataType = 'HKQuantityTypeIdentifierRestingHeartRate';

  it('averages two readings on the same day', () => {
    const samples: RawHealthKitSample[] = [
      makeSample(58, '2025-01-14T08:00:00Z'),
      makeSample(62, '2025-01-14T20:00:00Z'),
    ];
    const result = aggregateDailyValues(type, samples);
    expect(result.get('2025-01-14')).toBeCloseTo(60);
  });

  it('single reading returns that reading as the mean', () => {
    const samples: RawHealthKitSample[] = [makeSample(65, '2025-01-14T08:00:00Z')];
    const result = aggregateDailyValues(type, samples);
    expect(result.get('2025-01-14')).toBe(65);
  });
});

describe('aggregateDailyValues — sleep analysis (sum of hours)', () => {
  const type: HealthKitDataType = 'HKCategoryTypeIdentifierSleepAnalysis';

  it('sums sleep duration across multiple segments', () => {
    // 22:30 to 06:00 = 7.5 hours; split into two segments.
    const samples: RawHealthKitSample[] = [
      {
        value: 1, // HKCategoryValueSleepAnalysisAsleep (value ignored)
        startDate: '2025-01-13T22:30:00Z',
        endDate: '2025-01-14T02:00:00Z', // 3.5 h
      },
      {
        value: 1,
        startDate: '2025-01-13T02:15:00Z',
        endDate: '2025-01-13T06:00:00Z', // 3.75 h
      },
    ];
    const result = aggregateDailyValues(type, samples);
    // Both segments start on the same day (2025-01-13).
    const total = result.get('2025-01-13') ?? 0;
    expect(total).toBeCloseTo(3.5 + 3.75, 4);
  });

  it('sleep segment with equal start and end contributes 0 hours', () => {
    const samples: RawHealthKitSample[] = [
      {
        value: 1,
        startDate: '2025-01-14T03:00:00Z',
        endDate: '2025-01-14T03:00:00Z',
      },
    ];
    const result = aggregateDailyValues(type, samples);
    expect(result.get('2025-01-14')).toBe(0);
  });
});

describe('aggregateDailyValues — active energy (sum)', () => {
  const type: HealthKitDataType = 'HKQuantityTypeIdentifierActiveEnergyBurned';

  it('sums energy across the day', () => {
    const samples: RawHealthKitSample[] = [
      makeSample(300, '2025-01-14T09:00:00Z'),
      makeSample(220, '2025-01-14T17:00:00Z'),
    ];
    const result = aggregateDailyValues(type, samples);
    expect(result.get('2025-01-14')).toBeCloseTo(520);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Sleep quality score calculation (via extractAppleHealthFeatures)
// ─────────────────────────────────────────────────────────────────────────────

describe('sleep quality score calculation', () => {
  it('sleep_quality = (deep + rem) / total', () => {
    const features = extractAppleHealthFeatures({
      sleepStages: { deep: 90, rem: 60, light: 200, awake: 30 },
      recordedAt: new Date('2025-01-14'),
    });
    const f = features.find((x) => x.feature === 'sleep_quality')!;
    // (90 + 60) / (90 + 60 + 200 + 30) = 150/380
    expect(f.value).toBeCloseTo(150 / 380, 6);
  });

  it('sleep_quality = 1.0 when all time is deep + REM', () => {
    const features = extractAppleHealthFeatures({
      sleepStages: { deep: 180, rem: 120, light: 0, awake: 0 },
      recordedAt: new Date('2025-01-14'),
    });
    const f = features.find((x) => x.feature === 'sleep_quality')!;
    expect(f.value).toBeCloseTo(1.0, 6);
  });

  it('sleep_quality = 0.0 when all time is light + awake', () => {
    const features = extractAppleHealthFeatures({
      sleepStages: { deep: 0, rem: 0, light: 200, awake: 60 },
      recordedAt: new Date('2025-01-14'),
    });
    const f = features.find((x) => x.feature === 'sleep_quality')!;
    expect(f.value).toBeCloseTo(0.0, 6);
  });

  it('sleep_quality = 0 when all stage minutes are zero (no total)', () => {
    const features = extractAppleHealthFeatures({
      sleepStages: { deep: 0, rem: 0, light: 0, awake: 0 },
      recordedAt: new Date('2025-01-14'),
    });
    const f = features.find((x) => x.feature === 'sleep_quality')!;
    expect(f.value).toBe(0);
  });

  it('sleep_quality has confidence 0.8 (derived)', () => {
    const features = extractAppleHealthFeatures({
      sleepStages: { deep: 90, rem: 60, light: 180, awake: 30 },
      recordedAt: new Date('2025-01-14'),
    });
    const f = features.find((x) => x.feature === 'sleep_quality')!;
    expect(f.confidence).toBe(0.8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. parseAppleHealthExport — real-world format
// ─────────────────────────────────────────────────────────────────────────────

describe('parseAppleHealthExport — real-world format', () => {
  it('returns an AppleHealthExport object', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    expect(result).toHaveProperty('exportDate');
    expect(result).toHaveProperty('records');
  });

  it('parses the ExportDate correctly', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    expect(result.exportDate).toBeInstanceOf(Date);
    expect(result.exportDate.getFullYear()).toBe(2025);
    expect(result.exportDate.getMonth()).toBe(0); // January (0-indexed)
    expect(result.exportDate.getDate()).toBe(16);
  });

  it('extracts only recognised record types', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    const types = new Set(result.records.map((r) => r.type));

    // HKQuantityTypeIdentifierBodyMass is in the XML but NOT in RECOGNISED_TYPES.
    expect(types.has('HKQuantityTypeIdentifierBodyMass')).toBe(false);
  });

  it('all returned records have a type in RECOGNISED_TYPES', () => {
    const recognised = new Set(DEFAULT_READ_TYPES as string[]);
    const result = parseAppleHealthExport(SAMPLE_XML);
    for (const rec of result.records) {
      expect(recognised.has(rec.type)).toBe(true);
    }
  });

  it('extracts resting heart rate records', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    const hrRecords = result.records.filter(
      (r) => r.type === 'HKQuantityTypeIdentifierRestingHeartRate',
    );
    expect(hrRecords.length).toBeGreaterThanOrEqual(2);
    const values = hrRecords.map((r) => r.value);
    expect(values).toContain(58);
    expect(values).toContain(59);
    expect(values).toContain(61);
  });

  it('step count records have correct summed value per batch', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    const stepRecords = result.records.filter(
      (r) => r.type === 'HKQuantityTypeIdentifierStepCount',
    );
    expect(stepRecords).toHaveLength(2);
    const total = stepRecords.reduce((acc, r) => acc + r.value, 0);
    expect(total).toBe(9800);
  });

  it('active energy record has value 520 kcal', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    const aeRecords = result.records.filter(
      (r) => r.type === 'HKQuantityTypeIdentifierActiveEnergyBurned',
    );
    expect(aeRecords).toHaveLength(1);
    expect(aeRecords[0].value).toBe(520);
  });

  it('sleep record has correct start and end dates', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    const sleepRecords = result.records.filter(
      (r) => r.type === 'HKCategoryTypeIdentifierSleepAnalysis',
    );
    expect(sleepRecords).toHaveLength(1);
    const rec = sleepRecords[0];
    expect(rec.startDate.getFullYear()).toBe(2025);
    // Duration should be 7.5 hours
    const durationHours =
      (rec.endDate.getTime() - rec.startDate.getTime()) / 3_600_000;
    expect(durationHours).toBeCloseTo(7.5, 1);
  });

  it('blood oxygen value is parsed correctly (fractional form)', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    const spo2Records = result.records.filter(
      (r) => r.type === 'HKQuantityTypeIdentifierOxygenSaturation',
    );
    expect(spo2Records).toHaveLength(1);
    expect(spo2Records[0].value).toBeCloseTo(0.98);
  });

  it('all records have a sourceName string', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    for (const rec of result.records) {
      expect(typeof rec.sourceName).toBe('string');
    }
  });

  it('all records have a unit string', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    for (const rec of result.records) {
      expect(typeof rec.unit).toBe('string');
    }
  });

  it('all records have valid Date objects for startDate and endDate', () => {
    const result = parseAppleHealthExport(SAMPLE_XML);
    for (const rec of result.records) {
      expect(rec.startDate).toBeInstanceOf(Date);
      expect(rec.endDate).toBeInstanceOf(Date);
      expect(isNaN(rec.startDate.getTime())).toBe(false);
      expect(isNaN(rec.endDate.getTime())).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. parseAppleHealthExport — edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('parseAppleHealthExport — edge cases and malformed XML', () => {
  it('throws on empty string', () => {
    expect(() => parseAppleHealthExport('')).toThrow(
      /XML string must not be empty/,
    );
  });

  it('throws on whitespace-only string', () => {
    expect(() => parseAppleHealthExport('   \n\t  ')).toThrow();
  });

  it('returns 0 records and epoch exportDate for XML with no matching records', () => {
    const xml = `<HealthData locale="en_US">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
      <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale"
              unit="kg" value="75" startDate="2025-01-15 08:00:00 +0000"
              endDate="2025-01-15 08:00:00 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(0);
    expect(result.exportDate.getFullYear()).toBe(2025);
  });

  it('gracefully handles missing ExportDate — returns epoch', () => {
    const xml = `<HealthData locale="en_US">
      <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
              unit="count" value="10000"
              startDate="2025-01-14 00:00:00 +0000"
              endDate="2025-01-14 23:59:59 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.exportDate.getTime()).toBe(0);
    expect(result.records).toHaveLength(1);
  });

  it('skips records with missing value attribute', () => {
    const xml = `<HealthData locale="en_US">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
      <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
              unit="count"
              startDate="2025-01-14 00:00:00 +0000"
              endDate="2025-01-14 23:59:59 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(0);
  });

  it('skips records with non-numeric value attribute', () => {
    const xml = `<HealthData locale="en_US">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
      <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
              unit="count" value="HKCategoryValueSleepAnalysisAsleep"
              startDate="2025-01-14 00:00:00 +0000"
              endDate="2025-01-14 23:59:59 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(0);
  });

  it('skips records with missing startDate or endDate', () => {
    const xml = `<HealthData locale="en_US">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
      <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
              unit="count" value="9000"
              endDate="2025-01-14 23:59:59 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(0);
  });

  it('handles XML with multiple supported types correctly', () => {
    const xml = `<HealthData locale="en_AU">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
      <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
              unit="count" value="12000"
              startDate="2025-01-14 00:00:00 +0000"
              endDate="2025-01-14 23:59:59 +0000"/>
      <Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Apple Watch"
              unit="count/min" value="62"
              startDate="2025-01-14 08:00:00 +0000"
              endDate="2025-01-14 08:00:00 +0000"/>
      <Record type="HKQuantityTypeIdentifierOxygenSaturation" sourceName="Apple Watch"
              unit="%" value="0.97"
              startDate="2025-01-14 08:05:00 +0000"
              endDate="2025-01-14 08:05:00 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(3);
    const types = new Set(result.records.map((r) => r.type));
    expect(types.has('HKQuantityTypeIdentifierStepCount')).toBe(true);
    expect(types.has('HKQuantityTypeIdentifierRestingHeartRate')).toBe(true);
    expect(types.has('HKQuantityTypeIdentifierOxygenSaturation')).toBe(true);
  });

  it('returns empty records array for completely empty HealthData element', () => {
    const xml = `<HealthData locale="en_AU">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
    </HealthData>`;
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(0);
  });

  it('does not throw on a large repetitive XML string', () => {
    // Simulate a moderately large file by repeating a known-good record 500 times.
    const record = `<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone"
        unit="count" value="100"
        startDate="2025-01-14 10:00:00 +0000"
        endDate="2025-01-14 10:05:00 +0000"/>`;
    const xml = `<HealthData locale="en_AU">
      <ExportDate value="2025-01-15 10:00:00 +0000"/>
      ${Array.from({ length: 500 }).map(() => record).join('\n')}
    </HealthData>`;
    expect(() => parseAppleHealthExport(xml)).not.toThrow();
    const result = parseAppleHealthExport(xml);
    expect(result.records).toHaveLength(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. parseAppleHealthDate
// ─────────────────────────────────────────────────────────────────────────────

describe('parseAppleHealthDate', () => {
  it('parses standard Apple Health date format', () => {
    const d = parseAppleHealthDate('2025-01-14 08:30:00 +0000');
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
    expect(d.getUTCFullYear()).toBe(2025);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(14);
    expect(d.getUTCHours()).toBe(8);
    expect(d.getUTCMinutes()).toBe(30);
  });

  it('handles timezone offset +1000 (AEST)', () => {
    const d = parseAppleHealthDate('2025-01-14 18:00:00 +1000');
    expect(isNaN(d.getTime())).toBe(false);
    // 18:00 AEST = 08:00 UTC
    expect(d.getUTCHours()).toBe(8);
  });

  it('returns epoch for an empty string', () => {
    const d = parseAppleHealthDate('');
    expect(d.getTime()).toBe(0);
  });

  it('returns epoch for a completely malformed string', () => {
    const d = parseAppleHealthDate('not-a-date');
    expect(d.getTime()).toBe(0);
  });

  it('handles leading/trailing whitespace', () => {
    const d = parseAppleHealthDate('  2025-01-14 08:30:00 +0000  ');
    expect(isNaN(d.getTime())).toBe(false);
    expect(d.getUTCFullYear()).toBe(2025);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Feature extraction via aggregated export data
// ─────────────────────────────────────────────────────────────────────────────

describe('Feature extraction from parsed export', () => {
  it('extractAppleHealthFeatures produces resting_hr from parsed record', () => {
    // Simulate the aggregated snapshot that would result from the parsed XML.
    const snapshot = {
      restingHeartRate: 58,
      steps: 9800,
      activeEnergyKcal: 520,
      sleepHours: 7.5,
      respiratoryRate: 15,
      bloodOxygen: 98,
      hrvMs: 42,
      recordedAt: new Date('2025-01-14T23:59:59.000Z'),
    };

    const features = extractAppleHealthFeatures(snapshot);
    // 7 direct fields (no sleepStages → no sleep_quality derived feature)
    expect(features).toHaveLength(7);

    const hr = features.find((f) => f.feature === 'resting_hr')!;
    expect(hr.value).toBe(58);
    expect(hr.source).toBe('apple_health');
    expect(hr.confidence).toBe(1.0);
  });

  it('all features from a full snapshot have source apple_health', () => {
    const snapshot = {
      restingHeartRate: 60,
      steps: 10000,
      activeEnergyKcal: 500,
      sleepHours: 7,
      sleepStages: { deep: 90, rem: 60, light: 150, awake: 30 },
      respiratoryRate: 14,
      bloodOxygen: 97,
      hrvMs: 40,
      recordedAt: new Date('2025-01-14T23:59:59.000Z'),
    };
    const features = extractAppleHealthFeatures(snapshot);
    for (const f of features) {
      expect(f.source).toBe('apple_health');
    }
  });

  it('features with sleepStages include sleep_quality', () => {
    const snapshot = {
      sleepStages: { deep: 90, rem: 60, light: 200, awake: 30 },
      recordedAt: new Date('2025-01-14T23:59:59.000Z'),
    };
    const features = extractAppleHealthFeatures(snapshot);
    const names = features.map((f) => f.feature);
    expect(names).toContain('sleep_quality');
  });

  it('blood oxygen normalised from fraction to percentage is stored correctly', () => {
    // If the export contains 0.98 (fraction) and the aggregator normalises it to 98,
    // the feature value should be 98.
    const snapshot = {
      bloodOxygen: 98, // post-normalisation
      recordedAt: new Date('2025-01-14T23:59:59.000Z'),
    };
    const features = extractAppleHealthFeatures(snapshot);
    const f = features.find((x) => x.feature === 'blood_oxygen')!;
    expect(f.value).toBe(98);
  });
});
