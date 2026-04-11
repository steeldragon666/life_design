import { describe, it, expect } from 'vitest';
import {
  extractWeatherFeatures,
  type WeatherData,
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

describe('extractWeatherFeatures', () => {
  describe('temperature categories', () => {
    it('returns cold for temperature < 5', () => {
      const result = extractWeatherFeatures(weather({ temperature: 4 }));
      expect(result.temperatureCategory).toBe('cold');
    });

    it('returns cool for temperature 5-14', () => {
      const result = extractWeatherFeatures(weather({ temperature: 5 }));
      expect(result.temperatureCategory).toBe('cool');
      const result2 = extractWeatherFeatures(weather({ temperature: 14 }));
      expect(result2.temperatureCategory).toBe('cool');
    });

    it('returns mild for temperature 15-24', () => {
      const result = extractWeatherFeatures(weather({ temperature: 15 }));
      expect(result.temperatureCategory).toBe('mild');
      const result2 = extractWeatherFeatures(weather({ temperature: 24 }));
      expect(result2.temperatureCategory).toBe('mild');
    });

    it('returns warm for temperature 25-34', () => {
      const result = extractWeatherFeatures(weather({ temperature: 25 }));
      expect(result.temperatureCategory).toBe('warm');
      const result2 = extractWeatherFeatures(weather({ temperature: 34 }));
      expect(result2.temperatureCategory).toBe('warm');
    });

    it('returns hot for temperature >= 35', () => {
      const result = extractWeatherFeatures(weather({ temperature: 35 }));
      expect(result.temperatureCategory).toBe('hot');
    });
  });

  describe('sunlight levels', () => {
    it('returns very_low for sunlight < 3 hours', () => {
      const result = extractWeatherFeatures(weather({ sunlightHours: 2 }));
      expect(result.sunlightLevel).toBe('very_low');
    });

    it('returns low for sunlight 3-5 hours', () => {
      const result = extractWeatherFeatures(weather({ sunlightHours: 3 }));
      expect(result.sunlightLevel).toBe('low');
      const result2 = extractWeatherFeatures(weather({ sunlightHours: 5 }));
      expect(result2.sunlightLevel).toBe('low');
    });

    it('returns moderate for sunlight 6-9 hours', () => {
      const result = extractWeatherFeatures(weather({ sunlightHours: 6 }));
      expect(result.sunlightLevel).toBe('moderate');
      const result2 = extractWeatherFeatures(weather({ sunlightHours: 9 }));
      expect(result2.sunlightLevel).toBe('moderate');
    });

    it('returns high for sunlight >= 10 hours', () => {
      const result = extractWeatherFeatures(weather({ sunlightHours: 10 }));
      expect(result.sunlightLevel).toBe('high');
    });
  });

  describe('pressure change', () => {
    it('returns falling when pressure drops by more than 3 hPa', () => {
      const prev = weather({ barometricPressure: 1020 });
      const curr = weather({ barometricPressure: 1016 });
      const result = extractWeatherFeatures(curr, prev);
      expect(result.pressureChange).toBe('falling');
    });

    it('returns stable when pressure change is within 3 hPa', () => {
      const prev = weather({ barometricPressure: 1013 });
      const curr = weather({ barometricPressure: 1015 });
      const result = extractWeatherFeatures(curr, prev);
      expect(result.pressureChange).toBe('stable');
    });

    it('returns rising when pressure increases by more than 3 hPa', () => {
      const prev = weather({ barometricPressure: 1010 });
      const curr = weather({ barometricPressure: 1014 });
      const result = extractWeatherFeatures(curr, prev);
      expect(result.pressureChange).toBe('rising');
    });

    it('returns null when no previous data', () => {
      const result = extractWeatherFeatures(weather({}));
      expect(result.pressureChange).toBeNull();
    });
  });

  describe('SAD risk indicator', () => {
    it('returns true when sunlight < 3 AND cloudCover > 80', () => {
      const result = extractWeatherFeatures(
        weather({ sunlightHours: 2, cloudCover: 85 }),
      );
      expect(result.sadRiskIndicator).toBe(true);
    });

    it('returns false when sunlight >= 3 even with high clouds', () => {
      const result = extractWeatherFeatures(
        weather({ sunlightHours: 3, cloudCover: 90 }),
      );
      expect(result.sadRiskIndicator).toBe(false);
    });

    it('returns false when cloudCover <= 80 even with low sunlight', () => {
      const result = extractWeatherFeatures(
        weather({ sunlightHours: 1, cloudCover: 80 }),
      );
      expect(result.sadRiskIndicator).toBe(false);
    });
  });

  describe('outdoor friendly', () => {
    it('returns true when no rain, temp 10-30, wind < 30', () => {
      const result = extractWeatherFeatures(
        weather({ precipitationMm: 0, temperature: 20, windSpeedKmh: 15 }),
      );
      expect(result.outdoorFriendly).toBe(true);
    });

    it('returns false with rain', () => {
      const result = extractWeatherFeatures(
        weather({ precipitationMm: 5, temperature: 20, windSpeedKmh: 15 }),
      );
      expect(result.outdoorFriendly).toBe(false);
    });

    it('returns false with temperature below 10', () => {
      const result = extractWeatherFeatures(
        weather({ precipitationMm: 0, temperature: 9, windSpeedKmh: 15 }),
      );
      expect(result.outdoorFriendly).toBe(false);
    });

    it('returns false with temperature above 30', () => {
      const result = extractWeatherFeatures(
        weather({ precipitationMm: 0, temperature: 31, windSpeedKmh: 15 }),
      );
      expect(result.outdoorFriendly).toBe(false);
    });

    it('returns false with high wind', () => {
      const result = extractWeatherFeatures(
        weather({ precipitationMm: 0, temperature: 20, windSpeedKmh: 30 }),
      );
      expect(result.outdoorFriendly).toBe(false);
    });
  });

  describe('mood impact score', () => {
    it('returns positive score for sunny mild day', () => {
      const result = extractWeatherFeatures(
        weather({
          sunlightHours: 12,
          temperature: 20,
          precipitationMm: 0,
        }),
      );
      expect(result.moodImpactScore).toBeGreaterThan(0);
      expect(result.moodImpactScore).toBeLessThanOrEqual(1);
    });

    it('returns negative score for dark rainy day with falling pressure', () => {
      const prev = weather({ barometricPressure: 1020 });
      const curr = weather({
        sunlightHours: 1,
        temperature: 3,
        precipitationMm: 10,
        barometricPressure: 1005,
      });
      const result = extractWeatherFeatures(curr, prev);
      expect(result.moodImpactScore).toBeLessThan(0);
      expect(result.moodImpactScore).toBeGreaterThanOrEqual(-1);
    });

    it('clamps score to [-1, 1] range', () => {
      // Extreme positive
      const positive = extractWeatherFeatures(
        weather({ sunlightHours: 14, temperature: 20, precipitationMm: 0 }),
      );
      expect(positive.moodImpactScore).toBeLessThanOrEqual(1);

      // Extreme negative
      const prev = weather({ barometricPressure: 1030 });
      const negative = extractWeatherFeatures(
        weather({
          sunlightHours: 0,
          temperature: -10,
          precipitationMm: 50,
          barometricPressure: 990,
        }),
        prev,
      );
      expect(negative.moodImpactScore).toBeGreaterThanOrEqual(-1);
    });
  });
});
