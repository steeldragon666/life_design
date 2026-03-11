/**
 * Weather integration using OpenWeatherMap API.
 * Requires OPENWEATHER_API_KEY env variable.
 *
 * Used by the AI mentor system to:
 * - Warn about bad weather for outdoor calendar events
 * - Suggest indoor alternatives (local movie screenings, etc.)
 * - Track weather impact on mood patterns
 */

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  isRainy: boolean;
  isCold: boolean;
  isHot: boolean;
}

export interface WeatherForecast {
  date: string;
  temperature: number;
  description: string;
  isRainy: boolean;
}

export async function getCurrentWeather(postcode: string): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || !postcode) return null;

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?zip=${encodeURIComponent(postcode)},GB&appid=${apiKey}&units=metric`,
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );

    if (!res.ok) return null;
    const data = await res.json();

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0]?.description ?? 'Unknown',
      icon: data.weather[0]?.icon ?? '',
      humidity: data.main.humidity,
      windSpeed: data.wind?.speed ?? 0,
      isRainy: ['Rain', 'Drizzle', 'Thunderstorm'].includes(data.weather[0]?.main ?? ''),
      isCold: data.main.temp < 5,
      isHot: data.main.temp > 30,
    };
  } catch {
    return null;
  }
}

export async function getForecast(postcode: string, days: number = 3): Promise<WeatherForecast[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || !postcode) return [];

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?zip=${encodeURIComponent(postcode)},GB&appid=${apiKey}&units=metric`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return [];
    const data = await res.json();

    // Group by day, take midday reading
    const dailyForecasts: WeatherForecast[] = [];
    const seen = new Set<string>();

    for (const item of data.list ?? []) {
      const date = item.dt_txt.split(' ')[0];
      if (seen.has(date) || dailyForecasts.length >= days) continue;

      // Prefer midday readings
      const hour = parseInt(item.dt_txt.split(' ')[1].split(':')[0]);
      if (hour >= 11 && hour <= 14) {
        seen.add(date);
        dailyForecasts.push({
          date,
          temperature: Math.round(item.main.temp),
          description: item.weather[0]?.description ?? 'Unknown',
          isRainy: ['Rain', 'Drizzle', 'Thunderstorm'].includes(item.weather[0]?.main ?? ''),
        });
      }
    }

    return dailyForecasts;
  } catch {
    return [];
  }
}

/**
 * Build weather context string for AI mentor system prompt.
 * Includes current conditions and alerts about upcoming bad weather.
 */
export async function buildWeatherContext(postcode: string): Promise<string | null> {
  const [current, forecast] = await Promise.all([
    getCurrentWeather(postcode),
    getForecast(postcode, 3),
  ]);

  if (!current) return null;

  const lines: string[] = [
    `\nWeather (${postcode}):`,
    `- Current: ${current.temperature}°C, ${current.description}`,
  ];

  if (current.isRainy) {
    lines.push('- ALERT: Currently raining — suggest indoor alternatives for any outdoor plans');
  }
  if (current.isCold) {
    lines.push('- ALERT: Very cold — recommend warm clothing and check on heating');
  }
  if (current.isHot) {
    lines.push('- ALERT: Very hot — recommend hydration and avoiding midday outdoor activities');
  }

  const rainyDays = forecast.filter((f) => f.isRainy);
  if (rainyDays.length > 0) {
    lines.push(`- Upcoming rain forecast: ${rainyDays.map((d) => d.date).join(', ')} — proactively suggest indoor alternatives like local cinema, museum, or indoor hobbies`);
  }

  return lines.join('\n');
}
