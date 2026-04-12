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

export interface WeatherTrend {
  rollingAvgSunlightHours: number;
  rollingAvgCloudCover: number;
  trendDirection: 'improving' | 'stable' | 'worsening';
  sustainedLowLightDays: number;  // consecutive trailing days with sunlight < 4h
  sadRisk: boolean;               // trend-based SAD risk indicator
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

/**
 * Compute weather trend from a rolling window of daily data.
 *
 * SAD risk triggers when ALL of:
 * - 5+ consecutive trailing days with sunlight < 4h
 * - Rolling average sunlight (entire window) < 4h
 * - Rolling average cloud cover (entire window) > 70%
 *
 * @param dailyData - Array of daily weather observations (oldest first)
 * @throws Error if dailyData is empty
 */
export function computeWeatherTrend(dailyData: WeatherData[]): WeatherTrend {
  if (dailyData.length === 0) {
    throw new Error('dailyData must contain at least one entry');
  }

  const n = dailyData.length;

  // Rolling averages
  const rollingAvgSunlightHours =
    Math.round((dailyData.reduce((s, d) => s + d.sunlightHours, 0) / n) * 100) / 100;
  const rollingAvgCloudCover =
    Math.round((dailyData.reduce((s, d) => s + d.cloudCover, 0) / n) * 100) / 100;

  // Trend direction: compare first-half avg vs second-half avg sunlight
  let trendDirection: WeatherTrend['trendDirection'] = 'stable';
  if (n >= 2) {
    const mid = Math.floor(n / 2);
    const firstHalf = dailyData.slice(0, mid);
    const secondHalf = dailyData.slice(mid);
    const firstAvg = firstHalf.reduce((s, d) => s + d.sunlightHours, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, d) => s + d.sunlightHours, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 0.5) {
      trendDirection = 'improving';
    } else if (diff < -0.5) {
      trendDirection = 'worsening';
    }
  }

  // Sustained low-light days: count consecutive trailing days with sunlight < 4h
  let sustainedLowLightDays = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (dailyData[i].sunlightHours < 4) {
      sustainedLowLightDays++;
    } else {
      break;
    }
  }

  // SAD risk: sustained low light 5+ days AND high cloud cover average
  const sadRisk =
    sustainedLowLightDays >= 5 &&
    rollingAvgSunlightHours < 4 &&
    rollingAvgCloudCover > 70;

  return {
    rollingAvgSunlightHours,
    rollingAvgCloudCover,
    trendDirection,
    sustainedLowLightDays,
    sadRisk,
  };
}
