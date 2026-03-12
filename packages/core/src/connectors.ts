import { Dimension, IntegrationProvider } from './enums';
import { normalizeProviderPayload, type NormalizedSignal } from './feature-extraction';

export interface LifeConnector {
  provider: IntegrationProvider;
  dimension: Dimension;
  fetchData(...args: any[]): Promise<any>;
  writeData?(...args: any[]): Promise<any>;
  normalizeData?(rawData: unknown): NormalizedSignal[];
  fetchNormalizedData?(...args: any[]): Promise<NormalizedSignal[]>;
}

export abstract class BaseLifeConnector implements LifeConnector {
  constructor(
    public provider: IntegrationProvider,
    public dimension: Dimension,
    protected accessToken: string
  ) {}

  abstract fetchData(...args: any[]): Promise<any>;
  async writeData(..._args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }

  normalizeData(rawData: unknown): NormalizedSignal[] {
    return normalizeProviderPayload(this.provider, rawData, this.dimension);
  }

  async fetchNormalizedData(...args: any[]): Promise<NormalizedSignal[]> {
    const rawData = await this.fetchData(...args);
    return this.normalizeData(rawData);
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

export class SpotifyConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Spotify, Dimension.Growth, accessToken);
  }

  async fetchData() {
    // Fetch recently played tracks
    const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.json();
  }

  async getTopTracks(timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term') {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=50`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );
    return response.json();
  }
}

export class SlackConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Slack, Dimension.Career, accessToken);
  }

  async fetchData() {
    // Get channel list as basic data
    const response = await fetch('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.json();
  }

  async getUserPresence() {
    const response = await fetch('https://slack.com/api/users.getPresence', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.json();
  }
}

export class InstagramConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Instagram, Dimension.Social, accessToken);
  }

  async fetchData() {
    // Get basic user info and media count
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${this.accessToken}`,
    );
    return response.json();
  }

  async getRecentMedia(limit: number = 25) {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${limit}&access_token=${this.accessToken}`,
    );
    return response.json();
  }
}

export class NotionConnector extends BaseLifeConnector {
  constructor(accessToken: string) {
    super(IntegrationProvider.Notion, Dimension.Career, accessToken);
  }

  async fetchData() {
    // List databases as basic data
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter: { value: 'database', property: 'object' } }),
    });
    return response.json();
  }

  async queryDatabase(databaseId: string) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }
}

export function getConnector(provider: IntegrationProvider, accessToken: string): LifeConnector | null {
  switch (provider) {
    case IntegrationProvider.Strava:
      return new StravaConnector(accessToken);
    case IntegrationProvider.GoogleCalendar:
      return new GoogleCalendarConnector(accessToken);
    case IntegrationProvider.Spotify:
      return new SpotifyConnector(accessToken);
    case IntegrationProvider.Slack:
      return new SlackConnector(accessToken);
    case IntegrationProvider.Instagram:
      return new InstagramConnector(accessToken);
    case IntegrationProvider.Notion:
      return new NotionConnector(accessToken);
    default:
      return null;
  }
}

export function normalizeConnectorData(
  provider: IntegrationProvider,
  rawData: unknown,
  fallbackDimension?: Dimension,
): NormalizedSignal[] {
  return normalizeProviderPayload(provider, rawData, fallbackDimension);
}
