# Integration Audit Results

**Date:** 2026-04-12
**Auditor:** Sprint 0 cleanup + Phase 1 audit

## Summary

| Integration | OAuth Route | Data Connector | Required Env Vars | Status |
|-------------|------------|----------------|-------------------|--------|
| Strava | `/api/auth/strava` | `packages/core/src/connectors/strava.ts` | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | Working (real OAuth logic) |
| Spotify | `/api/auth/spotify` | `apps/web/src/lib/integrations/spotify.ts` | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Working (real OAuth logic) |
| Google Calendar | `/api/auth/google` | `packages/core/src/connectors/google-calendar.ts` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Working (real OAuth logic) |
| Apple Health | `/api/integrations/apple-health` (POST) | `packages/core/src/connectors/apple-health.ts` | None (push-based from iOS app) | Working (data ingestion API) |
| Banking | `/api/integrations/banking/callback` | `apps/web/src/lib/integrations/banking.ts` | `OPENBANKING_CLIENT_ID`, `OPENBANKING_CLIENT_SECRET`, `OPENBANKING_AUTH_URL`, `OPENBANKING_TOKEN_URL` | Stub (placeholder URLs) |
| Weather | N/A (no OAuth) | `apps/web/src/lib/integrations/weather.ts` | Unknown (needs review) | Unknown |

## Details

### Strava
- Full OAuth flow implemented with state parameter, PKCE-style redirect
- Callback at `/api/integrations/strava/callback` and `/api/connect/strava/callback`
- Core connector exists for activity data
- **Needs:** Verify env vars are set in Vercel deployment

### Spotify
- Full OAuth flow with scopes: `user-read-recently-played`, `user-top-read`, `user-read-currently-playing`
- Callback at `/api/integrations/spotify/callback`
- Integration file exists for data fetching
- **Needs:** Verify env vars are set in Vercel deployment

### Google Calendar
- Full OAuth flow with dynamic scope support (calendar vs gmail)
- Callback at `/api/integrations/google/callback` and `/api/connect/google/callback`
- Core connector for calendar data
- **Needs:** Verify env vars are set in Vercel deployment

### Apple Health
- No OAuth (push-based from iOS companion app)
- POST endpoint receives: date, sleepHours, steps, activeMinutes, heartRateAvg, heartRateVariability
- Core connector exists
- **Needs:** iOS companion app to push data (no web-only flow)

### Banking (Open Banking)
- OAuth config uses placeholder URLs (`https://ob.example.com/authorize`)
- Callback route exists but likely untested against real provider
- Integration service file exists with financial analysis logic
- **Status:** Stub - needs real Open Banking provider (TrueLayer, Plaid, etc.)

### Weather
- Service file exists at `apps/web/src/lib/integrations/weather.ts`
- No OAuth required (API key based)
- **Needs:** Review implementation and env var requirements

## Removed Integrations
- **Notion** - OAuth routes, callbacks, config, and lib file deleted in Sprint 0
- **Slack** - OAuth routes, callbacks, and config deleted in Sprint 0
- **Instagram** - Previously removed via migration 00027
- **LinkedIn** - Previously removed via migration 00035

## Action Items
1. Verify Strava/Spotify/Google env vars are configured in Vercel
2. Banking needs real Open Banking provider integration (Phase 3 scope)
3. Weather service needs review for Phase 2 weather context feature
4. Apple Health flow requires iOS companion app (mobile app dependency)
