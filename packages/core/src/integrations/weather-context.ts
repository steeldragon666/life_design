export interface WeatherData {
  temperature: number;           // Celsius
  humidity: number;              // 0-100%
  cloudCover: number;            // 0-100%
  sunlightHours: number;         // hours of sunlight
  barometricPressure: number;    // hPa
  uvIndex: number;               // 0-11+
  precipitationMm: number;       // daily precipitation
  windSpeedKmh: number;
}

export interface WeatherFeatures {
  temperatureCategory: 'cold' | 'cool' | 'mild' | 'warm' | 'hot';
  sunlightLevel: 'very_low' | 'low' | 'moderate' | 'high';
  pressureChange: 'falling' | 'stable' | 'rising' | null; // null if no previous
  sadRiskIndicator: boolean;     // Seasonal Affective Disorder risk
  outdoorFriendly: boolean;      // good conditions for outdoor activity
  moodImpactScore: number;       // -1 to 1 (negative = mood-dampening weather)
}

/**
 * Extract mood-relevant weather features.
 *
 * SAD risk: sunlight < 3h AND cloud cover > 80% (sustained)
 * Outdoor friendly: no rain, temp 10-30°C, wind < 30km/h
 * Mood impact: combination of sunlight (positive), pressure changes (negative), extreme temps (negative)
 */
export function extractWeatherFeatures(
  current: WeatherData,
  previous?: WeatherData,
): WeatherFeatures {
  // Temperature category
  const temperatureCategory =
    current.temperature < 5 ? 'cold' :
    current.temperature < 15 ? 'cool' :
    current.temperature < 25 ? 'mild' :
    current.temperature < 35 ? 'warm' : 'hot';

  // Sunlight level
  const sunlightLevel =
    current.sunlightHours < 3 ? 'very_low' :
    current.sunlightHours < 6 ? 'low' :
    current.sunlightHours < 10 ? 'moderate' : 'high';

  // Pressure change
  let pressureChange: WeatherFeatures['pressureChange'] = null;
  if (previous) {
    const diff = current.barometricPressure - previous.barometricPressure;
    pressureChange = diff < -3 ? 'falling' : diff > 3 ? 'rising' : 'stable';
  }

  // SAD risk
  const sadRiskIndicator = current.sunlightHours < 3 && current.cloudCover > 80;

  // Outdoor friendly
  const outdoorFriendly =
    current.precipitationMm === 0 &&
    current.temperature >= 10 && current.temperature <= 30 &&
    current.windSpeedKmh < 30;

  // Mood impact score (-1 to 1)
  // Sunlight strongly positive, extreme weather negative
  const sunlightFactor = Math.min(0.5, (current.sunlightHours / 14) * 0.5);
  const tempFactor = current.temperature >= 15 && current.temperature <= 25 ? 0.2 : -0.1;
  const pressureFactor = pressureChange === 'falling' ? -0.2 : 0;
  const rainFactor = current.precipitationMm > 0 ? -0.1 : 0.1;
  const moodImpactScore = Math.max(-1, Math.min(1,
    Math.round((sunlightFactor + tempFactor + pressureFactor + rainFactor) * 100) / 100
  ));

  return {
    temperatureCategory,
    sunlightLevel,
    pressureChange,
    sadRiskIndicator,
    outdoorFriendly,
    moodImpactScore,
  };
}
