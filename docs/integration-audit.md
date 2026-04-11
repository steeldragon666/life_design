# Integration Audit — Phase 1 Prerequisite

**Date:** 2026-04-11
**Purpose:** Smoke test every external integration connector to verify it authenticates and returns data. Document status and budget repair time before building analysis layers in Phase 2.

---

## Connector Status Summary

| Provider | File | Status | Auth Method | Data Returns | Issues Found |
|---|---|---|---|---|---|
| Spotify | `apps/web/src/lib/integrations/spotify.ts` | Functional | OAuth2 (client credentials + refresh token) | Recent tracks, top genres, listening hours, AI context string | Tokens stored as plaintext in legacy `integrations` table (TODO in code to migrate to AES-256-GCM). `currentlyPlaying` always returns `null` (needs `/me/player` endpoint). No rate limit handling. |
| Apple Health | `apps/web/src/lib/integrations/apple-health.ts` | Partial — data reader only | None (push model via mobile bridge) | Sleep hours/quality, steps, active minutes, heart rate avg, HRV | No ingest endpoint exists in this file — only reads from `health_metrics` table. Assumes an iOS app pushes data, but no iOS app exists in the repo. No data validation on inbound records. |
| Open Banking | `apps/web/src/lib/integrations/banking.ts` | Partial — placeholder URLs | OAuth2 (client credentials + refresh token) | Spending summary (daily/weekly/monthly), top categories, unusual spending flag | Token URL defaults to `https://ob.example.com/token` — not a real endpoint. API URL also defaults to example domain. Requires AISP registration with a real UK Open Banking provider. Tokens stored as plaintext (same TODO as Spotify). |
| Weather | `apps/web/src/lib/integrations/weather.ts` | Functional | API key (`OPENWEATHER_API_KEY`) | Current conditions (temp, humidity, wind, rain/cold/hot flags), 3-day forecast | Hardcoded to `GB` country code. No rate limit handling. Uses Next.js `revalidate` caching (30 min current, 60 min forecast). No error differentiation (invalid key vs network error vs bad postcode). |
| Strava | `packages/core/src/connectors/strava.ts` | Functional | OAuth2 (code exchange + refresh token) | Activities with type, distance, time, heart rate, suffer score; normalised features via extraction pipeline; full sync with Supabase logging | Most robust connector. Proactive token refresh (5-min buffer). Exponential backoff retry for 429/5xx (3 attempts). Pagination support. Full sync pipeline with `connector_sync_log`. |
| Google Calendar | `packages/core/src/connectors/google-calendar.ts` | Functional | OAuth2 (code exchange + refresh token) | Calendar events with classification (meeting/focus/social/personal), normalised features, full sync pipeline | Well-implemented. Proactive token refresh. Multi-calendar support. Event classification heuristics. Pagination via `nextPageToken`. Graceful 403/404 skip for restricted calendars. No retry logic (unlike Strava). |

---

## OAuth Infrastructure

| File | Purpose | Notes |
|---|---|---|
| `apps/web/src/lib/integrations/oauth.ts` | Generic OAuth provider config, validation, auth URL builder, code exchange | Covers Strava, Spotify, Notion, Open Banking, Google, Slack, Instagram. Uses Basic auth for Notion/Spotify, JSON body for others. |
| `apps/web/src/lib/integrations/providers.ts` | Provider registry with metadata (name, description, dimension mapping, auth type) | Lists 10 providers total. Includes Gmail, Slack, Instagram, Notion — none of which have dedicated connector files yet. |

---

## Detailed Findings

### Spotify — FUNCTIONAL (minor issues)
- Makes real API calls to `api.spotify.com` for recently played tracks and top artists.
- Token refresh implemented via Spotify's `/api/token` endpoint.
- Error handling: returns `null` on any failure (swallows errors silently).
- **Security concern:** Tokens stored as plaintext in `integrations` table despite column name `access_token_encrypted`.
- Missing: `currentlyPlaying` field is hardcoded to `null`.

### Apple Health — PARTIAL (data reader only)
- Reads from a `health_metrics` Supabase table but has no mechanism to populate it.
- Designed as a push model (iOS app sends data to API), but no iOS app or ingest API route exists.
- Sleep quality derivation logic is duplicated between `getLatestHealthMetrics` and `getHealthTrend`.
- Effectively non-functional until a data source is established.

### Open Banking — PARTIAL (placeholder URLs)
- Full implementation of transaction fetching, spending aggregation, and category analysis.
- **Blocker:** Default API URLs point to `https://ob.example.com` — requires registration with a real AISP provider (e.g., TrueLayer, Plaid UK, Yapily).
- Same plaintext token security issue as Spotify.
- UK Open Banking Standard compliance (FAPI headers) partially implemented.

### Weather — FUNCTIONAL
- Straightforward OpenWeatherMap integration using API key auth.
- Two endpoints: current weather and 5-day forecast (filtered to midday readings).
- Hardcoded to GB postcodes — will need parameterisation for international users.
- No API key validation beyond null check.

### Strava — FUNCTIONAL (production-ready)
- Most mature connector in the codebase.
- Complete OAuth2 flow: auth URL construction, code exchange, token refresh.
- Robust error handling: exponential backoff for rate limits and server errors.
- Full sync pipeline: fetches activities, extracts features, stores in Supabase, logs sync status.
- Proactive token refresh within 5-minute expiry buffer.

### Google Calendar — FUNCTIONAL (production-ready)
- Complete OAuth2 flow with offline access for refresh tokens.
- Multi-calendar support via `calendarList` endpoint.
- Event classification heuristics (meeting/focus/social/personal) using attendee count and title keywords.
- Full sync pipeline with feature extraction and sync logging.
- Missing: no retry logic for transient failures (unlike Strava).

---

## Repair Needed

### Critical (blocks Phase 2)
- [ ] **Apple Health: Build data ingest pathway** — Either create an API route for mobile push, or implement a manual CSV import, or integrate with Apple HealthKit via a React Native bridge. Without this, health correlation features cannot work. **Estimate: 3-5 days**
- [ ] **Open Banking: Register with a real AISP provider** — Replace `ob.example.com` placeholder URLs with a real provider (TrueLayer, Yapily, or Plaid). Requires business registration and FCA compliance review. **Estimate: 5-10 days** (includes provider onboarding)

### High Priority (security / reliability)
- [ ] **Migrate token storage to AES-256-GCM encryption** — Spotify, Banking, and any future OAuth connectors store tokens as plaintext despite encrypted column names. Migrate to `user_connections` table via `oauth-manager.ts`. **Estimate: 2-3 days**
- [ ] **Add retry logic to Google Calendar connector** — Strava has exponential backoff; Google Calendar does not. Add consistent retry handling. **Estimate: 0.5 days**
- [ ] **Add rate limit handling to Spotify connector** — Currently no retry on 429 responses. **Estimate: 0.5 days**

### Medium Priority (quality / completeness)
- [ ] **Spotify: Implement `currentlyPlaying`** — Add call to `/me/player` endpoint. **Estimate: 0.5 days**
- [ ] **Weather: Parameterise country code** — Remove hardcoded `GB` to support international users. **Estimate: 0.5 days**
- [ ] **Apple Health: Deduplicate sleep quality logic** — Same derivation appears in two functions. Extract to shared helper. **Estimate: 0.25 days**
- [ ] **Add error differentiation across all connectors** — Currently most connectors return `null` on any failure with no logging. Add structured error types or at minimum `console.warn` for debugging. **Estimate: 1-2 days**

### Low Priority (future connectors)
- [ ] **Build connectors for registered providers without implementations** — Gmail, Slack, Instagram, Notion are listed in `providers.ts` and have OAuth configs in `oauth.ts` but no dedicated connector files. **Estimate: 2-3 days each**

---

## Total Repair Budget Estimate

| Priority | Items | Estimated Days |
|---|---|---|
| Critical | 2 | 8-15 days |
| High | 3 | 3-4 days |
| Medium | 4 | 2.25-3.25 days |
| Low | 4 | 8-12 days |
| **Total** | **13** | **21.25-34.25 days** |

**Recommendation:** Address Critical and High priority items before starting Phase 2 analysis work. Medium items can be tackled in parallel. Low priority items (new connectors) should be scheduled as their respective Phase 2 features approach.
