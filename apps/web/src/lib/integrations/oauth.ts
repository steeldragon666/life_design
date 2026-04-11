export interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
}

/**
 * Validates that an OAuth provider has the required configuration
 */
export function validateOAuthConfig(provider: OAuthProvider): boolean {
  if (!provider.clientId || provider.clientId === '') {
    console.error(`OAuth config missing client_id for ${provider.name}`);
    return false;
  }
  if (!provider.clientSecret || provider.clientSecret === '') {
    console.error(`OAuth config missing client_secret for ${provider.name}`);
    return false;
  }
  return true;
}

export const STRAVA_CONFIG: OAuthProvider = {
  name: 'strava',
  authUrl: 'https://www.strava.com/oauth/authorize',
  tokenUrl: 'https://www.strava.com/oauth/token',
  clientId: process.env.STRAVA_CLIENT_ID ?? '',
  clientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
  scopes: ['read', 'activity:read'],
};

export const SPOTIFY_CONFIG: OAuthProvider = {
  name: 'spotify',
  authUrl: 'https://accounts.spotify.com/authorize',
  tokenUrl: 'https://accounts.spotify.com/api/token',
  clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
  scopes: ['user-read-recently-played', 'user-top-read', 'user-read-currently-playing'],
};

export const NOTION_CONFIG: OAuthProvider = {
  name: 'notion',
  authUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  clientId: process.env.NOTION_CLIENT_ID ?? '',
  clientSecret: process.env.NOTION_CLIENT_SECRET ?? '',
  scopes: [],  // Notion uses integration-level permissions, not scopes
};

export const OPENBANKING_CONFIG: OAuthProvider = {
  name: 'banking',
  authUrl: process.env.OPENBANKING_AUTH_URL ?? 'https://ob.example.com/authorize',
  tokenUrl: process.env.OPENBANKING_TOKEN_URL ?? 'https://ob.example.com/token',
  clientId: process.env.OPENBANKING_CLIENT_ID ?? '',
  clientSecret: process.env.OPENBANKING_CLIENT_SECRET ?? '',
  scopes: ['accounts', 'transactions'],
};

export const GOOGLE_CONFIG: OAuthProvider = {
  name: 'google',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  scopes: [], // Set dynamically based on requested scope (calendar vs gmail)
};

export const GOOGLE_SCOPES: Record<string, string[]> = {
  google_calendar: ['https://www.googleapis.com/auth/calendar.readonly'],
  gmail: ['https://www.googleapis.com/auth/gmail.readonly'],
};

export const SLACK_CONFIG: OAuthProvider = {
  name: 'slack',
  authUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  clientId: process.env.SLACK_CLIENT_ID ?? '',
  clientSecret: process.env.SLACK_CLIENT_SECRET ?? '',
  scopes: ['channels:history', 'channels:read', 'users:read'],
};

export function buildAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider.scopes.join(','),
    state,
  });
  return `${provider.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  redirectUri?: string,
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  // Notion and Spotify use Basic auth + form-encoded body
  const useBasicAuth = ['notion', 'spotify'].includes(provider.name);

  const headers: Record<string, string> = {};
  let body: string;

  if (useBasicAuth) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Authorization'] = `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString('base64')}`;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    });
    if (redirectUri) params.set('redirect_uri', redirectUri);
    body = params.toString();
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      grant_type: 'authorization_code',
    });
  }

  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json();
}
