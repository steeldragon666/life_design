import { describe, it, expect } from 'vitest';
import {
  computeDigitalPhenotype,
  generateScreenTimeInsight,
  type DigitalPhenotype,
} from '../screen-time-phenotyping';
import type { ScreenTimeFeatures } from '../../integrations/screen-time-features';

function makeFeatures(overrides: Partial<ScreenTimeFeatures> = {}): ScreenTimeFeatures {
  return {
    totalDailyMinutes: 180,
    socialMediaRatio: 0.2,
    productivityRatio: 0.4,
    lateNightUsageMinutes: 10,
    avgPickupsPerDay: 50,
    digitalWellnessScore: 3.5,
    ...overrides,
  };
}

describe('computeDigitalPhenotype', () => {
  it('should return null for fewer than 3 days of data', () => {
    const features = [makeFeatures(), makeFeatures()];
    const dates = ['2025-01-01', '2025-01-02'];
    expect(computeDigitalPhenotype(features, dates)).toBeNull();
  });

  it('should return null for empty arrays', () => {
    expect(computeDigitalPhenotype([], [])).toBeNull();
  });

  it('should compute correct average daily minutes', () => {
    const features = [
      makeFeatures({ totalDailyMinutes: 100 }),
      makeFeatures({ totalDailyMinutes: 200 }),
      makeFeatures({ totalDailyMinutes: 300 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
    const result = computeDigitalPhenotype(features, dates)!;
    expect(result.averageDailyMinutes).toBe(200);
  });

  it('should compute correct average pickups per day', () => {
    const features = [
      makeFeatures({ avgPickupsPerDay: 30 }),
      makeFeatures({ avgPickupsPerDay: 60 }),
      makeFeatures({ avgPickupsPerDay: 90 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
    const result = computeDigitalPhenotype(features, dates)!;
    expect(result.averagePickupsPerDay).toBe(60);
  });

  it('should compute correct late-night frequency', () => {
    const features = [
      makeFeatures({ lateNightUsageMinutes: 0 }),
      makeFeatures({ lateNightUsageMinutes: 45 }), // >30 min
      makeFeatures({ lateNightUsageMinutes: 60 }), // >30 min
      makeFeatures({ lateNightUsageMinutes: 10 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'];
    const result = computeDigitalPhenotype(features, dates)!;
    expect(result.lateNightFrequency).toBe(0.5); // 2 out of 4
  });

  it('should compute correct category distribution', () => {
    const features = [
      makeFeatures({ socialMediaRatio: 0.3, productivityRatio: 0.5 }),
      makeFeatures({ socialMediaRatio: 0.5, productivityRatio: 0.3 }),
      makeFeatures({ socialMediaRatio: 0.4, productivityRatio: 0.4 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
    const result = computeDigitalPhenotype(features, dates)!;

    expect(result.categoryDistribution['social_media']).toBeCloseTo(0.4, 5);
    expect(result.categoryDistribution['productivity']).toBeCloseTo(0.4, 5);
    // 'other' should be the remainder
    expect(result.categoryDistribution['other']).toBeCloseTo(0.2, 5);
  });

  it('should determine dominant category correctly', () => {
    const features = [
      makeFeatures({ socialMediaRatio: 0.1, productivityRatio: 0.7 }),
      makeFeatures({ socialMediaRatio: 0.1, productivityRatio: 0.6 }),
      makeFeatures({ socialMediaRatio: 0.1, productivityRatio: 0.8 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
    const result = computeDigitalPhenotype(features, dates)!;
    expect(result.dominantCategory).toBe('productivity');
  });

  it('should increase compulsive use score with high pickups', () => {
    const lowPickups = [
      makeFeatures({ avgPickupsPerDay: 20, totalDailyMinutes: 120 }),
      makeFeatures({ avgPickupsPerDay: 25, totalDailyMinutes: 120 }),
      makeFeatures({ avgPickupsPerDay: 22, totalDailyMinutes: 120 }),
    ];
    const highPickups = [
      makeFeatures({ avgPickupsPerDay: 120, totalDailyMinutes: 120 }),
      makeFeatures({ avgPickupsPerDay: 130, totalDailyMinutes: 120 }),
      makeFeatures({ avgPickupsPerDay: 140, totalDailyMinutes: 120 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];

    const lowResult = computeDigitalPhenotype(lowPickups, dates)!;
    const highResult = computeDigitalPhenotype(highPickups, dates)!;

    expect(highResult.compulsiveUseScore).toBeGreaterThan(lowResult.compulsiveUseScore);
  });

  it('should reflect social media ratio in social media dependence score', () => {
    const lowSocial = [
      makeFeatures({ socialMediaRatio: 0.05, lateNightUsageMinutes: 0 }),
      makeFeatures({ socialMediaRatio: 0.05, lateNightUsageMinutes: 0 }),
      makeFeatures({ socialMediaRatio: 0.05, lateNightUsageMinutes: 0 }),
    ];
    const highSocial = [
      makeFeatures({ socialMediaRatio: 0.7, lateNightUsageMinutes: 40 }),
      makeFeatures({ socialMediaRatio: 0.8, lateNightUsageMinutes: 50 }),
      makeFeatures({ socialMediaRatio: 0.75, lateNightUsageMinutes: 45 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];

    const lowResult = computeDigitalPhenotype(lowSocial, dates)!;
    const highResult = computeDigitalPhenotype(highSocial, dates)!;

    expect(highResult.socialMediaDependenceScore).toBeGreaterThan(lowResult.socialMediaDependenceScore);
  });

  it('should reflect late-night minutes in circadian disruption score', () => {
    const noLateNight = [
      makeFeatures({ lateNightUsageMinutes: 0 }),
      makeFeatures({ lateNightUsageMinutes: 0 }),
      makeFeatures({ lateNightUsageMinutes: 0 }),
    ];
    const heavyLateNight = [
      makeFeatures({ lateNightUsageMinutes: 90 }),
      makeFeatures({ lateNightUsageMinutes: 120 }),
      makeFeatures({ lateNightUsageMinutes: 100 }),
    ];
    const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];

    const noLateResult = computeDigitalPhenotype(noLateNight, dates)!;
    const heavyResult = computeDigitalPhenotype(heavyLateNight, dates)!;

    expect(heavyResult.circadianDisruptionScore).toBeGreaterThan(noLateResult.circadianDisruptionScore);
    expect(noLateResult.circadianDisruptionScore).toBe(0);
  });

  describe('usage trend detection', () => {
    it('should detect increasing trend', () => {
      const features = [
        makeFeatures({ totalDailyMinutes: 100 }),
        makeFeatures({ totalDailyMinutes: 150 }),
        makeFeatures({ totalDailyMinutes: 200 }),
        makeFeatures({ totalDailyMinutes: 250 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.usageTrend).toBe('increasing');
    });

    it('should detect decreasing trend', () => {
      const features = [
        makeFeatures({ totalDailyMinutes: 300 }),
        makeFeatures({ totalDailyMinutes: 250 }),
        makeFeatures({ totalDailyMinutes: 200 }),
        makeFeatures({ totalDailyMinutes: 150 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.usageTrend).toBe('decreasing');
    });

    it('should detect stable trend', () => {
      const features = [
        makeFeatures({ totalDailyMinutes: 200 }),
        makeFeatures({ totalDailyMinutes: 195 }),
        makeFeatures({ totalDailyMinutes: 205 }),
        makeFeatures({ totalDailyMinutes: 200 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.usageTrend).toBe('stable');
    });
  });

  describe('JITAI flags', () => {
    it('should set highCompulsiveUse when compulsiveUseScore > 60', () => {
      const features = [
        makeFeatures({ avgPickupsPerDay: 150, totalDailyMinutes: 400 }),
        makeFeatures({ avgPickupsPerDay: 160, totalDailyMinutes: 420 }),
        makeFeatures({ avgPickupsPerDay: 170, totalDailyMinutes: 440 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.compulsiveUseScore).toBeGreaterThan(60);
      expect(result.highCompulsiveUse).toBe(true);
    });

    it('should not set highCompulsiveUse for low compulsive use', () => {
      const features = [
        makeFeatures({ avgPickupsPerDay: 20, totalDailyMinutes: 60 }),
        makeFeatures({ avgPickupsPerDay: 25, totalDailyMinutes: 70 }),
        makeFeatures({ avgPickupsPerDay: 22, totalDailyMinutes: 65 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.compulsiveUseScore).toBeLessThanOrEqual(60);
      expect(result.highCompulsiveUse).toBe(false);
    });

    it('should set socialMediaConcern when socialMediaDependenceScore > 50', () => {
      const features = [
        makeFeatures({ socialMediaRatio: 0.7, lateNightUsageMinutes: 50 }),
        makeFeatures({ socialMediaRatio: 0.8, lateNightUsageMinutes: 60 }),
        makeFeatures({ socialMediaRatio: 0.75, lateNightUsageMinutes: 55 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.socialMediaDependenceScore).toBeGreaterThan(50);
      expect(result.socialMediaConcern).toBe(true);
    });

    it('should set sleepDisruptionRisk when circadianDisruptionScore > 40', () => {
      const features = [
        makeFeatures({ lateNightUsageMinutes: 60 }),
        makeFeatures({ lateNightUsageMinutes: 90 }),
        makeFeatures({ lateNightUsageMinutes: 75 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.circadianDisruptionScore).toBeGreaterThan(40);
      expect(result.sleepDisruptionRisk).toBe(true);
    });

    it('should not set sleepDisruptionRisk for low late-night usage', () => {
      const features = [
        makeFeatures({ lateNightUsageMinutes: 0 }),
        makeFeatures({ lateNightUsageMinutes: 5 }),
        makeFeatures({ lateNightUsageMinutes: 0 }),
      ];
      const dates = ['2025-01-01', '2025-01-02', '2025-01-03'];
      const result = computeDigitalPhenotype(features, dates)!;
      expect(result.circadianDisruptionScore).toBeLessThanOrEqual(40);
      expect(result.sleepDisruptionRisk).toBe(false);
    });
  });
});

describe('generateScreenTimeInsight', () => {
  it('should produce meaningful text', () => {
    const phenotype: DigitalPhenotype = {
      averageDailyMinutes: 240,
      averagePickupsPerDay: 80,
      lateNightFrequency: 0.6,
      categoryDistribution: { social_media: 0.4, productivity: 0.3, other: 0.3 },
      dominantCategory: 'social_media',
      compulsiveUseScore: 65,
      socialMediaDependenceScore: 55,
      circadianDisruptionScore: 50,
      usageTrend: 'increasing',
      highCompulsiveUse: true,
      socialMediaConcern: true,
      sleepDisruptionRisk: true,
    };
    const insight = generateScreenTimeInsight(phenotype);
    expect(insight).toBeTruthy();
    expect(typeof insight).toBe('string');
    expect(insight.length).toBeGreaterThan(20);
  });

  it('should mention late-night usage when sleepDisruptionRisk is true', () => {
    const phenotype: DigitalPhenotype = {
      averageDailyMinutes: 180,
      averagePickupsPerDay: 40,
      lateNightFrequency: 0.7,
      categoryDistribution: { productivity: 0.6, other: 0.4 },
      dominantCategory: 'productivity',
      compulsiveUseScore: 30,
      socialMediaDependenceScore: 10,
      circadianDisruptionScore: 55,
      usageTrend: 'stable',
      highCompulsiveUse: false,
      socialMediaConcern: false,
      sleepDisruptionRisk: true,
    };
    const insight = generateScreenTimeInsight(phenotype);
    expect(insight.toLowerCase()).toMatch(/late.night|sleep|evening/);
  });

  it('should mention social media when socialMediaConcern is true', () => {
    const phenotype: DigitalPhenotype = {
      averageDailyMinutes: 200,
      averagePickupsPerDay: 60,
      lateNightFrequency: 0.2,
      categoryDistribution: { social_media: 0.5, other: 0.5 },
      dominantCategory: 'social_media',
      compulsiveUseScore: 40,
      socialMediaDependenceScore: 65,
      circadianDisruptionScore: 20,
      usageTrend: 'stable',
      highCompulsiveUse: false,
      socialMediaConcern: true,
      sleepDisruptionRisk: false,
    };
    const insight = generateScreenTimeInsight(phenotype);
    expect(insight.toLowerCase()).toMatch(/social media/);
  });

  it('should produce a positive insight when all scores are low', () => {
    const phenotype: DigitalPhenotype = {
      averageDailyMinutes: 90,
      averagePickupsPerDay: 20,
      lateNightFrequency: 0.0,
      categoryDistribution: { productivity: 0.7, other: 0.3 },
      dominantCategory: 'productivity',
      compulsiveUseScore: 10,
      socialMediaDependenceScore: 5,
      circadianDisruptionScore: 0,
      usageTrend: 'decreasing',
      highCompulsiveUse: false,
      socialMediaConcern: false,
      sleepDisruptionRisk: false,
    };
    const insight = generateScreenTimeInsight(phenotype);
    expect(insight.length).toBeGreaterThan(10);
  });
});
