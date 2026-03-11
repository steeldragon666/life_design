-- Add new integration providers: Spotify, Apple Health, Notion, Open Banking
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'spotify';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'apple_health';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'notion';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'banking';
