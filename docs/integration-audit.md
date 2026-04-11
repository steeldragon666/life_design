# Integration Audit — Phase 1 Prerequisite

**Date:** 2026-04-11
**Purpose:** Smoke test every external integration connector to verify it authenticates and returns data. Document status and budget repair time before building analysis layers in Phase 2.

---

## Connector Status Summary

| Provider | File | Status | Auth Method | Data Returns | Issues Found |
|---|---|---|---|---|---|
| Spotify | `apps/web/src/lib/integrations/spotify.ts` | Functional | OAuth2 (client credentials + refresh token) | Recent tracks, top genres, listening hours, AI context string | Tokens stored as plaintext in legacy `integrations` table (TODO in code to migrate to AES-256-GCM). `currentlyPlaying` always returns `null` (needs `/me/player` endpoint). No rate limit handling. |
| Apple Health | `packages/core/src/connectors/apple-health.ts` (831 lines — primary), `apps/web/src/lib/integrations/apple-health.ts` (data reader) | Functional — core connector production-ready; web layer is read-only | HealthKit native permissions via expo-health (iOS); XML import for web | Resting HR, HRV (SDNN), sleep hours + stage-level quality, steps, active energy, respiratory rate, SpO2; normalised features with dimension mapping; Supabase upsert | Core connector has full HealthKit sync (`syncHealthKitData`), background delivery with 1-hour debounce (`setupBackgroundSync`), permission negotiation (`requestHealthKitPermissions`), XML export parser (`parseAppleHealthExport`), daily aggregation pipeline, and feature extraction to `feature_store`. Web layer only reads from `health_metrics` table — the two files target different tables and are not yet wired together. |
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

### Apple Health — FUNCTIONAL (core connector production-ready; web layer partial)
- **Core connector** (`packages/core/src/connectors/apple-health.ts`, 831 lines) provides a complete HealthKit integration:
  - `requestHealthKitPermissions` — iOS native permission negotiation via expo-health (read-only; never writes).
  - `syncHealthKitData` — Queries HealthKit for 7 data types (resting HR, HRV, sleep, steps, active energy, respiratory rate, SpO2), aggregates to daily values, and runs feature extraction. Returns `HealthKitSyncResult` with normalised features.
  - `setupBackgroundSync` — Registers HealthKit background delivery observers with a 1-hour debounce per user. Auto-syncs the last 24 hours and upserts features to `feature_store` via Supabase.
  - `parseAppleHealthExport` — Dependency-free regex-based XML parser for Apple Health export files. Handles sleep analysis category values correctly.
  - `extractAppleHealthFeatures` — Maps raw biometric data to `NormalisedFeature` objects across Health, Growth, and Fitness dimensions.
  - `storeFeatures` — Upserts normalised features into the `feature_store` table with dedup on `(user_id, feature, recorded_at)`.
  - Platform-guarded: dynamic import of expo-health with clear error messages on unsupported platforms.
- **Web layer** (`apps/web/src/lib/integrations/apple-health.ts`) is a separate, simpler data reader that queries a `health_metrics` table (not `feature_store`). It is not wired to the core connector.
- Sleep quality derivation logic is duplicated between `getLatestHealthMetrics` and `getHealthTrend` in the web layer.
- **Gap:** The web layer and core connector target different Supabase tables and are not integrated. The web dashboard cannot yet surface data ingested by the core connector.

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
- [ ] **Apple Health: Wire web layer to core connector** — A full HealthKit integration already exists in `packages/core/src/connectors/apple-health.ts` (sync, background delivery, XML import, feature extraction, Supabase upsert to `feature_store`). The web dashboard layer (`apps/web/src/lib/integrations/apple-health.ts`) reads from a separate `health_metrics` table and is unaware of the core connector. Remaining work: either update the web layer to read from `feature_store`, or unify the two tables, and surface the core connector's richer data (SpO2, respiratory rate, sleep stages) in the dashboard. **Estimate: 1-2 days**
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
| Critical | 2 | 6-12 days |
| High | 3 | 3-4 days |
| Medium | 4 | 2.25-3.25 days |
| Low | 4 | 8-12 days |
| **Total** | **13** | **19.25-31.25 days** |

**Recommendation:** Address Critical and High priority items before starting Phase 2 analysis work. Medium items can be tackled in parallel. Low priority items (new connectors) should be scheduled as their respective Phase 2 features approach.
