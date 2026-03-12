import { Dimension, IntegrationProvider } from './enums';

export interface LifeConnector {
  provider: IntegrationProvider;
  dimension: Dimension;
  fetchData(...args: any[]): Promise<any>;
  writeData?(...args: any[]): Promise<any>;
}

export abstract class BaseLifeConnector implements LifeConnector {
  constructor(
    public provider: IntegrationProvider,
    public dimension: Dimension,
    protected accessToken: string
  ) {}

  abstract fetchData(...args: any[]): Promise<any>;
  async writeData(...args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }
}

export class StravaConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Strava, Dimension.Fitness, accessToken);
  }

  async fetchData() {
    // Basic implementation for fetching activities
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.json();
  }
}

export class GoogleCalendarConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.GoogleCalendar, Dimension.Growth, accessToken);
  }

  async fetchData() {
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.json();
  }

  async createEvent(event: {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }) {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    return response.json();
  }

  async writeData(event: any) {
    return this.createEvent(event);
  }
}

export class GoogleSearchConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.GoogleCalendar, Dimension.Growth, accessToken);
  }

  async fetchData(query: string) {
    // Custom Search JSON API
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}`
    );
    return response.json();
  }
}

export class GoogleMapsConnector extends BaseLifeConnector {
  constructor() {
    super(IntegrationProvider.GoogleCalendar, Dimension.Social, '');
  }

  async fetchData(location: string, type: string) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=5000&type=${type}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    return response.json();
  }
}

export class WeatherConnector extends BaseLifeConnector {
  constructor() {
    super(IntegrationProvider.GoogleCalendar, Dimension.Health, '');
  }

  async fetchData(postcode: string) {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?zip=${postcode}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );
    return response.json();
  }
}

export async function getGranularContext(postcode: string, profession: string | null, interests: string[]) {
  const weatherConnector = new WeatherConnector();
  const mapsConnector = new GoogleMapsConnector();
  const searchConnector = new GoogleSearchConnector('');

  const [weather, nearbyHubs, searchData] = await Promise.all([
    weatherConnector.fetchData(postcode).catch(() => null),
    mapsConnector.fetchData(postcode, 'cafe').catch(() => null),
    profession ? searchConnector.fetchData(`${profession} trends 2026`).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    weather,
    nearbyHubs,
    searchData,
    professionContext: profession,
    interests,
    timestamp: new Date().toISOString(),
  };
}

export function getConnector(provider: IntegrationProvider, accessToken: string): LifeConnector | null {
  switch (provider) {
    case IntegrationProvider.Strava:
      return new StravaConnector(accessToken);
    case IntegrationProvider.GoogleCalendar:
      return new GoogleCalendarConnector(accessToken);
    default:
      return null;
  }
}
