# TODOS

## AI-Local / ML Pipeline

### ~~P1: pgvector Embedding Storage~~ DONE
Migration `00016_pgvector_embeddings.sql` adds `vector(384)` columns to `checkins`, `goals`, `daily_checkins`. Includes `find_similar_journal_entries()` RPC and IVFFlat indexes.

### ~~P2: Similar Journal Entries~~ DONE
Component: `apps/web/src/components/checkin/similar-entries.tsx`. Debounces 800ms, embeds current text, calls `find_similar_journal_entries` RPC, shows top 3 matches with similarity percentage.

### ~~P2: Smart Journal Prompts~~ DONE
Prompt bank: `apps/web/src/lib/smart-prompts.ts` (32 prompts across 8 dimensions). Component: `apps/web/src/components/checkin/smart-prompts.tsx`. Suggests prompts for weakest dimensions.

### ~~P3: Offline-First AI Indicator~~ DONE
Component: `apps/web/src/components/settings/offline-ai-indicator.tsx`. 3 states: cached (green), partial (amber), not-cached (gray). Checks Cache API for Transformers.js model files.

### ~~P3: embedBatch Optimization~~ DONE
`packages/ai-local/src/embed.ts` now passes arrays to the pipeline for true batch processing instead of sequential iteration.

### ~~P3: Model Cache Management UI~~ DONE
Component: `apps/web/src/components/settings/ai-cache-management.tsx`. Shows per-model size, total storage, "Clear AI cache" button. Clears both Cache API and IndexedDB stores.

## Future Considerations

### P2: Embedding Persistence Pipeline
Wire client-side embeddings into Supabase upserts during check-in flow. After `embed()` completes, POST the Float32Array to an API route that stores it in the `journal_embedding` column.
- **Effort:** M
- **Context:** The migration and RPC exist but embeddings are still computed-and-discarded. Need an API route + check-in form integration to persist them.

### P3: PostHog Telemetry for AI Features
Track model load time, inference duration, and feature usage via PostHog custom events. Deferred until PostHog is fully integrated.
- **Effort:** S
- **Context:** Basic PostHog setup exists but AI-specific events aren't wired yet.
