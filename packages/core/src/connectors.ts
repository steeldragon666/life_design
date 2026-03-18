import { Dimension, IntegrationProvider } from './enums';
import { normalizeProviderPayload, type NormalizedSignal } from './feature-extraction';

export interface LifeConnector {
  provider: IntegrationProvider;
  dimension: Dimension;
  fetchData(...args: unknown[]): Promise<unknown>;
  writeData?(...args: unknown[]): Promise<unknown>;
  normalizeData?(rawData: unknown): NormalizedSignal[];
  fetchNormalizedData?(...args: unknown[]): Promise<NormalizedSignal[]>;
}

export abstract class BaseLifeConnector implements LifeConnector {
  constructor(
    public provider: IntegrationProvider,
    public dimension: Dimension,
    protected accessToken: string
  ) {}

  protected async safeFetch(url: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`${this.provider} API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  abstract fetchData(...args: unknown[]): Promise<unknown>;
  async writeData(..._args: unknown[]): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  normalizeData(rawData: unknown): NormalizedSignal[] {
    return normalizeProviderPayload(this.provider, rawData, this.dimension);
  }

  async fetchNormalizedData(...args: unknown[]): Promise<NormalizedSignal[]> {
    const rawData = await this.fetchData(...args);
    return this.normalizeData(rawData);
  }
}

export class StravaConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Strava, Dimension.Fitness, accessToken);
  }

  async fetchData() {
    return this.safeFetch('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }
}

export class GoogleCalendarConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.GoogleCalendar, Dimension.Growth, accessToken);
  }

  async fetchData() {
    return this.safeFetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
  }

  async createEvent(event: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }) {
    return this.safeFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  }

  async writeData(event: unknown) {
    return this.createEvent(event as {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
    });
  }
}

export class GoogleSearchConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Gmail, Dimension.Growth, accessToken);
  }

  async fetchData(query: string) {
    return this.safeFetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`
    );
  }
}

export class GoogleMapsConnector extends BaseLifeConnector {
  constructor() {
    super(IntegrationProvider.Gmail, Dimension.Social, '');
  }

  async fetchData(location: string, type: string) {
    return this.safeFetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=5000&type=${type}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
  }
}

export class WeatherConnector extends BaseLifeConnector {
  constructor() {
    super(IntegrationProvider.Weather, Dimension.Health, '');
  }

  async fetchData(postcode: string) {
    return this.safeFetch(
      `https://api.openweathermap.org/data/2.5/weather?zip=${postcode}&appid=${process.env.OPENWEATHER_API_KEY ?? process.env.WEATHER_API_KEY}&units=metric`
    );
  }
}

export async function getGranularContext(postcode: string, profession: string | null, interests: string[]) {
  const weatherConnector = new WeatherConnector();
  const mapsConnector = new GoogleMapsConnector();
  const searchConnector = new GoogleSearchConnector('');

  const [weather, nearbyHubs, searchData] = await Promise.all([
    weatherConnector.fetchData(postcode).catch(() => null),
    mapsConnector.fetchData(postcode, 'cafe').catch(() => null),
    profession
      ? searchConnector.fetchData(`${profession} industry trends ${interests.join(' ')}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  return { weather, nearbyHubs, searchData };
}
