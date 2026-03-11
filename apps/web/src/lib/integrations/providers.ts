export interface ProviderConfig {
  id: string;
  name: string;
  description: string;
  dimension: string;
  authType: 'oauth2' | 'api_key' | 'none';
}

export const INTEGRATION_PROVIDERS: ProviderConfig[] = [
  {
    id: 'strava',
    name: 'Strava',
    description: 'Sync fitness activities to track your Health & Fitness dimensions automatically.',
    dimension: 'Fitness, Health',
    authType: 'oauth2',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Your mentor can see upcoming events, suggest weather-appropriate alternatives, and help you balance commitments across life dimensions.',
    dimension: 'All dimensions',
    authType: 'oauth2',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Track email volume and patterns. Your mentor can notice when work communication spikes and suggest boundaries.',
    dimension: 'Career, Social',
    authType: 'oauth2',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Monitor work communication patterns. Detect after-hours messaging and meeting overload that may impact wellbeing.',
    dimension: 'Career, Social',
    authType: 'oauth2',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Track social media usage patterns. Your mentor can help if screen time correlates with lower mood scores.',
    dimension: 'Social, Romance',
    authType: 'oauth2',
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Automatic weather tracking based on your postcode. AI warns about bad weather for outdoor plans and suggests indoor alternatives.',
    dimension: 'Health, Social',
    authType: 'api_key',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Track listening patterns. Music choices often correlate with mood — your mentor can spot these patterns.',
    dimension: 'Growth, Social',
    authType: 'oauth2',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'Sync sleep, steps, and heart rate data for comprehensive health tracking.',
    dimension: 'Health, Fitness',
    authType: 'none',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Connect your productivity workspace. Track project progress and link it to your Career dimension.',
    dimension: 'Career, Growth',
    authType: 'oauth2',
  },
  {
    id: 'banking',
    name: 'Open Banking',
    description: 'Track spending patterns securely. Your mentor can correlate spending habits with your Finance dimension scores.',
    dimension: 'Finance',
    authType: 'oauth2',
  },
];
