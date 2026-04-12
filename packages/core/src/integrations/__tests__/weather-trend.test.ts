import { describe, it, expect } from 'vitest';
import {
  computeWeatherTrend,
  type WeatherData,
  type WeatherTrend,
} from '../weather-context';

const baseWeather: WeatherData = {
  temperature: 20,
  humidity: 50,
  cloudCover: 50,
  sunlightHours: 8,
  barometricPressure: 1013,
  uvIndex: 5,
  precipitationMm: 0,
  windSpeedKmh: 10,
};

function weather(overrides: Partial<WeatherData>): WeatherData {
  return { ...baseWeather, ...overrides };
}

/** Helper: create N days of identical weather */
function days(n: number, overrides: Partial<WeatherData> = {}): WeatherData[] {
  return Array.from({ length: n }, () => weather(overrides));
}

describe('computeWeatherTrend', () => {
  describe('rolling averages', () => {
    it('computes rolling average sunlight hours', () => {
      const data = [
        weather({ sunlightHours: 2 }),
        weather({ sunlightHours: 4 }),
        weather({ sunlightHours: 6 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.rollingAvgSunlightHours).toBe(4);
    });

    it('computes rolling average cloud cover', () => {
      const data = [
        weather({ cloudCover: 60 }),
        weather({ cloudCover: 80 }),
        weather({ cloudCover: 100 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.rollingAvgCloudCover).toBe(80);
    });
  });

  describe('trend direction', () => {
    it('detects increasing sunlight trend', () => {
      const data = [
        weather({ sunlightHours: 2 }),
        weather({ sunlightHours: 4 }),
        weather({ sunlightHours: 6 }),
        weather({ sunlightHours: 8 }),
        weather({ sunlightHours: 10 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.trendDirection).toBe('improving');
    });

    it('detects decreasing sunlight trend', () => {
      const data = [
        weather({ sunlightHours: 10 }),
        weather({ sunlightHours: 8 }),
        weather({ sunlightHours: 6 }),
        weather({ sunlightHours: 4 }),
        weather({ sunlightHours: 2 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.trendDirection).toBe('worsening');
    });

    it('detects stable sunlight trend', () => {
      const data = days(5, { sunlightHours: 6 });
      const trend = computeWeatherTrend(data);
      expect(trend.trendDirection).toBe('stable');
    });
  });

  describe('sustained low-light days', () => {
    it('counts consecutive low-light days (sunlight < 4h)', () => {
      const data = [
        weather({ sunlightHours: 2 }),
        weather({ sunlightHours: 3 }),
        weather({ sunlightHours: 1 }),
        weather({ sunlightHours: 3.5 }),
        weather({ sunlightHours: 2 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.sustainedLowLightDays).toBe(5);
    });

    it('resets count when a day has sufficient sunlight', () => {
      const data = [
        weather({ sunlightHours: 2 }),
        weather({ sunlightHours: 3 }),
        weather({ sunlightHours: 8 }), // breaks the streak
        weather({ sunlightHours: 1 }),
        weather({ sunlightHours: 2 }),
      ];
      const trend = computeWeatherTrend(data);
      // Longest consecutive run from the end
      expect(trend.sustainedLowLightDays).toBe(2);
    });

    it('returns 0 when no low-light days', () => {
      const data = days(5, { sunlightHours: 8 });
      const trend = computeWeatherTrend(data);
      expect(trend.sustainedLowLightDays).toBe(0);
    });
  });

  describe('SAD risk (trend-based)', () => {
    it('triggers when rolling avg sunlight < 4h for 5+ consecutive days AND avg cloud cover > 70%', () => {
      const data = days(7, { sunlightHours: 2, cloudCover: 85 });
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(true);
    });

    it('does not trigger with fewer than 5 consecutive low-light days', () => {
      const data = [
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(false);
    });

    it('does not trigger when avg cloud cover is <= 70%', () => {
      const data = days(7, { sunlightHours: 2, cloudCover: 60 });
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(false);
    });

    it('does not trigger at boundary: avg cloud cover exactly 70%', () => {
      const data = days(5, { sunlightHours: 2, cloudCover: 70 });
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(false);
    });

    it('does not trigger when rolling avg sunlight >= 4h', () => {
      const data = days(7, { sunlightHours: 5, cloudCover: 85 });
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(false);
    });

    it('triggers at exactly the boundary: 5 days, avg sunlight 3.9h, cloud cover 71%', () => {
      const data = days(5, { sunlightHours: 3.9, cloudCover: 71 });
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(true);
    });

    it('does not trigger at boundary: avg sunlight exactly 4h', () => {
      const data = days(5, { sunlightHours: 4, cloudCover: 85 });
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(false);
    });

    it('handles a break in low-light streak: only counts trailing consecutive days', () => {
      const data = [
        // 3 bad days
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
        // 1 good day breaks streak
        weather({ sunlightHours: 10, cloudCover: 20 }),
        // 4 bad days (not enough for SAD risk)
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
        weather({ sunlightHours: 2, cloudCover: 85 }),
      ];
      const trend = computeWeatherTrend(data);
      expect(trend.sadRisk).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles a single day of data', () => {
      const data = [weather({ sunlightHours: 3, cloudCover: 90 })];
      const trend = computeWeatherTrend(data);
      expect(trend.rollingAvgSunlightHours).toBe(3);
      expect(trend.rollingAvgCloudCover).toBe(90);
      expect(trend.sustainedLowLightDays).toBe(1);
      expect(trend.trendDirection).toBe('stable');
      expect(trend.sadRisk).toBe(false); // only 1 day, need 5+
    });

    it('throws for empty array', () => {
      expect(() => computeWeatherTrend([])).toThrow();
    });
  });
});
