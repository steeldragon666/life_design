import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LifeDesignDB } from '@/lib/db/schema';
import { FeaturePipeline, getFeatureConfidence } from '../feature-pipeline';
import type { NormalisedMLFeatures } from '../types';

// We need to mock the db module to use our test-specific DB instance
let testDb: LifeDesignDB;

// Mock the db singleton
import { vi } from 'vitest';
vi.mock('@/lib/db', () => ({
  get db() {
    return testDb;
  },
}));

describe('FeaturePipeline', () => {
  let pipeline: FeaturePipeline;

  beforeEach(() => {
    testDb = new LifeDesignDB();
    pipeline = new FeaturePipeline();
  });

  afterEach(async () => {
    await testDb.delete();
  });

  describe('imputeMissing', () => {
    it('fills all defaults when given an empty partial', () => {
      const result = pipeline.imputeMissing({});

      expect(result.sleep_duration_score).toBe(0.5);
      expect(result.sleep_quality_score).toBe(0.5);
      expect(result.physical_strain).toBe(0.5);
      expect(result.recovery_status).toBe(0.5);
      expect(result.meeting_load).toBe(0.5);
      expect(result.context_switching_penalty).toBe(0.5);
      expect(result.deep_work_opportunity).toBe(0.5);
      expect(result.after_hours_work).toBe(0.5);
      expect(result.digital_fatigue).toBe(0.5);
      expect(result.doomscroll_index).toBe(0.5);
      expect(result.audio_valence).toBe(0.5);
      expect(result.audio_energy).toBe(0.5);
      expect(result.day_of_week_sin).toBe(0);
      expect(result.day_of_week_cos).toBe(0);
      expect(result.is_weekend).toBe(false);
      expect(result.season_sprint).toBe(0);
      expect(result.season_recharge).toBe(0);
      expect(result.season_exploration).toBe(0);
    });

    it('preserves provided values and fills the rest', () => {
      const partial: Partial<NormalisedMLFeatures> = {
        sleep_duration_score: 0.9,
        physical_strain: 0.2,
        is_weekend: true,
        day_of_week_sin: 0.78,
      };

      const result = pipeline.imputeMissing(partial);

      // Provided values should be preserved
      expect(result.sleep_duration_score).toBe(0.9);
      expect(result.physical_strain).toBe(0.2);
      expect(result.is_weekend).toBe(true);
      expect(result.day_of_week_sin).toBe(0.78);

      // Missing values should be defaults
      expect(result.sleep_quality_score).toBe(0.5);
      expect(result.meeting_load).toBe(0.5);
      expect(result.season_sprint).toBe(0);
      expect(result.day_of_week_cos).toBe(0);
    });

    it('preserves zero values without treating them as missing', () => {
      const partial: Partial<NormalisedMLFeatures> = {
        sleep_duration_score: 0,
        season_sprint: 0,
      };

      const result = pipeline.imputeMissing(partial);
      expect(result.sleep_duration_score).toBe(0);
      expect(result.season_sprint).toBe(0);
    });
  });

  describe('cyclic encoding', () => {
    it('produces adjacent values for Saturday and Sunday', async () => {
      // Saturday 2026-03-14 and Sunday 2026-03-15
      const saturday = new Date('2026-03-14T12:00:00');
      const sunday = new Date('2026-03-15T12:00:00');

      const satFeatures = await pipeline.extract(saturday);
      const sunFeatures = await pipeline.extract(sunday);

      // Both should be weekends
      expect(satFeatures.is_weekend).toBe(true);
      expect(sunFeatures.is_weekend).toBe(true);

      // Cyclic encoding should produce nearby values for adjacent days
      // Saturday = day 6, Sunday = day 0 -> angles 2*PI*6/7 and 0
      const satAngle = (2 * Math.PI * 6) / 7;
      const sunAngle = 0;

      expect(satFeatures.day_of_week_sin).toBeCloseTo(Math.sin(satAngle), 5);
      expect(satFeatures.day_of_week_cos).toBeCloseTo(Math.cos(satAngle), 5);
      expect(sunFeatures.day_of_week_sin).toBeCloseTo(Math.sin(sunAngle), 5);
      expect(sunFeatures.day_of_week_cos).toBeCloseTo(Math.cos(sunAngle), 5);

      // Euclidean distance between Saturday and Sunday cyclic vectors
      // should be small (adjacent days on a circle)
      const dist = Math.sqrt(
        (satFeatures.day_of_week_sin - sunFeatures.day_of_week_sin) ** 2 +
        (satFeatures.day_of_week_cos - sunFeatures.day_of_week_cos) ** 2,
      );

      // Adjacent days on a 7-day circle: distance = 2*sin(PI/7) ~ 0.868
      // This is less than the max distance of 2 (opposite points)
      expect(dist).toBeLessThan(1);
    });

    it('produces is_weekend=false for a weekday', async () => {
      // Wednesday 2026-03-18
      const wednesday = new Date('2026-03-18T12:00:00');
      const features = await pipeline.extract(wednesday);
      expect(features.is_weekend).toBe(false);
    });
  });

  describe('extract', () => {
    it('saves a FeatureLogRecord to Dexie', async () => {
      const date = new Date('2026-03-18T12:00:00');
      await pipeline.extract(date);

      const log = await testDb.featureLogs.get('2026-03-18');
      expect(log).toBeDefined();
      expect(log!.date).toBe('2026-03-18');
      expect(log!.features).toBeDefined();
      expect(log!.extractedAt).toBeGreaterThan(0);
      expect(Array.isArray(log!.imputedFields)).toBe(true);
    });

    it('sets high feature confidence when all data is imputed', async () => {
      // No check-in data means all 12 numeric features are imputed
      const date = new Date('2026-03-18T12:00:00');
      await pipeline.extract(date);

      const log = await testDb.featureLogs.get('2026-03-18');
      // 12 imputed out of 12 numeric = confidence 0
      expect(log!.featureConfidence).toBe(0);
      expect(log!.imputedFields).toHaveLength(12);
    });

    it('defaults season encoding to Maintenance (all zeros) when no active season', async () => {
      const date = new Date('2026-03-18T12:00:00');
      const features = await pipeline.extract(date);
      expect(features.season_sprint).toBe(0);
      expect(features.season_recharge).toBe(0);
      expect(features.season_exploration).toBe(0);
    });
  });

  describe('getFeatureConfidence', () => {
    it('returns 0 when no log exists for the date', async () => {
      const confidence = await getFeatureConfidence(new Date('2026-01-01'));
      expect(confidence).toBe(0);
    });

    it('returns the stored confidence after extraction', async () => {
      const date = new Date('2026-03-18T12:00:00');
      await pipeline.extract(date);
      const confidence = await getFeatureConfidence(date);
      expect(typeof confidence).toBe('number');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });
});
