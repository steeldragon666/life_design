# Voice Mentors with ElevenLabs — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each mentor archetype (Eleanor, Theo, Maya) a distinct visual identity with character portraits and real AI voices via ElevenLabs streaming TTS.

**Architecture:** Server-side TTS proxy (`/api/tts`) streams audio from ElevenLabs → client plays via HTMLAudioElement blob. Mentor archetype resolved from Supabase `user_mentors` join → mapped to voice config. Browser `speechSynthesis` as fallback.

**Tech Stack:** Next.js 15 App Router, ElevenLabs REST API (Turbo v2.5), Supabase (auth + rate limiting), Web Audio (HTMLAudioElement), Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-03-16-voice-mentors-design.md` (Rev 2)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `apps/web/src/lib/mentor-types.ts` | Shared `PersonaBlend` type, `getDominantArchetype()`, `MentorAvatarState` type |
| `apps/web/src/lib/mentor-types.test.ts` | Tests for type mapping and dominant archetype |
| `apps/web/src/hooks/useElevenLabsTTS.ts` | Client-side TTS hook — fetch `/api/tts`, blob playback, fallback to browser TTS, lifecycle cleanup |
| `apps/web/src/hooks/__tests__/useElevenLabsTTS.test.ts` | Tests for TTS hook states, fallback, abort |
| `apps/web/src/app/api/tts/route.ts` | ElevenLabs streaming proxy — auth, rate limit, input validation, stream passthrough |
| `apps/web/src/app/api/tts/__tests__/route.test.ts` | Tests for TTS route — auth, validation, rate limiting |
| `apps/web/src/components/mentors/mentor-avatar.tsx` | Character portrait with idle/thinking/speaking states |
| `apps/web/src/components/mentors/__tests__/mentor-avatar.test.tsx` | Avatar rendering and state tests |
| `apps/web/src/components/settings/VoiceSettingsPanel.tsx` | Voice toggles, speed slider, voice preview |
| `apps/web/src/components/settings/__tests__/VoiceSettingsPanel.test.tsx` | Tests for VoiceSettingsPanel rendering and controls |
| `public/images/mentors/therapist/portrait-48.webp` | Eleanor placeholder portrait (48px) |
| `public/images/mentors/therapist/portrait-96.webp` | Eleanor placeholder portrait (96px) |
| `public/images/mentors/coach/portrait-48.webp` | Theo placeholder portrait (48px) |
| `public/images/mentors/coach/portrait-96.webp` | Theo placeholder portrait (96px) |
| `public/images/mentors/sage/portrait-48.webp` | Maya placeholder portrait (48px) |
| `public/images/mentors/sage/portrait-96.webp` | Maya placeholder portrait (96px) |

### Modified Files
| File | Changes |
|------|---------|
| `apps/web/src/lib/mentor-archetypes.ts` | Add visual + voice fields to `ArchetypeConfig`, add mapping functions |
| `apps/web/src/lib/services/mentor-service.ts` | Add `getUserMentorById()` |
| `apps/web/src/components/mentors/chat-bubble.tsx` | Import `PersonaBlend` from `mentor-types`, add `archetype`/`onSpeak` props, replace "M" orb with `MentorAvatar`, add speak button |
| `apps/web/src/components/mentors/persona-display.tsx` | Import `PersonaBlend` from `mentor-types` |
| `apps/web/src/components/mentors/mentor-card.tsx` | Add portrait, voice preview, visual redesign |
| `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/page.tsx` | Resolve archetype from user_mentor record, pass to ChatClient |
| `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/chat-client.tsx` | Accept `archetype` prop, wire TTS hook, auto-speak, fix hardcoded `'stoic'` |
| `apps/web/src/app/(protected)/settings/settings-client.tsx` | Add Voice & Personality section |
| `apps/web/src/config/assets.ts` | Add clarifying comment on voiceSamples |
| `.env.example` | Add `ELEVENLABS_API_KEY` |

### Supabase Migration
| Migration | Purpose |
|-----------|---------|
| `supabase/migrations/<timestamp>_tts_rate_limits.sql` | `tts_rate_limits` table for serverless-safe rate limiting (see Task 5 for naming) |

---

## Chunk 1: Foundation — Types, Mapping, Config

### Task 1: Extract shared PersonaBlend type and getDominantArchetype

**Files:**
- Create: `apps/web/src/lib/mentor-types.ts`
- Create: `apps/web/src/lib/mentor-types.test.ts`

- [ ] **Step 1: Write failing tests for PersonaBlend utilities**

```typescript
// apps/web/src/lib/mentor-types.test.ts
import { describe, it, expect } from 'vitest';
import { getDominantArchetype } from './mentor-types';
import type { PersonaBlend } from './mentor-types';

describe('getDominantArchetype', () => {
  it('returns therapist when therapist is dominant', () => {
    const blend: PersonaBlend = { therapist: 0.6, coach: 0.2, sage: 0.2 };
    expect(getDominantArchetype(blend)).toBe('therapist');
  });

  it('returns coach when coach is dominant', () => {
    const blend: PersonaBlend = { therapist: 0.2, coach: 0.5, sage: 0.3 };
    expect(getDominantArchetype(blend)).toBe('coach');
  });

  it('returns sage when sage is dominant', () => {
    const blend: PersonaBlend = { therapist: 0.1, coach: 0.2, sage: 0.7 };
    expect(getDominantArchetype(blend)).toBe('sage');
  });

  it('handles equal blend by returning first alphabetically', () => {
    const blend: PersonaBlend = { therapist: 0.34, coach: 0.33, sage: 0.33 };
    expect(getDominantArchetype(blend)).toBe('therapist');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/lib/mentor-types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement mentor-types.ts**

```typescript
// apps/web/src/lib/mentor-types.ts
import type { MentorArchetype } from './mentor-archetypes';

export interface PersonaBlend {
  therapist: number;
  coach: number;
  sage: number;
}

export type MentorAvatarState = 'idle' | 'thinking' | 'speaking';

export function getDominantArchetype(blend: PersonaBlend): MentorArchetype {
  const entries = Object.entries(blend) as [MentorArchetype, number][];
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/lib/mentor-types.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Update imports in chat-bubble.tsx and persona-display.tsx**

In `apps/web/src/components/mentors/chat-bubble.tsx`:
- Delete the entire local `export interface PersonaBlend { ... }` block (lines 7-11)
- In its place, add both the import and the re-export on two lines:
  ```typescript
  import type { PersonaBlend } from '@/lib/mentor-types';
  export type { PersonaBlend };
  ```
  This preserves the public export for any existing consumers while sourcing the type from the new shared location.

In `apps/web/src/components/mentors/persona-display.tsx`:
- Delete the entire local `PersonaBlend` interface block (lines 5-9)
- Add at the top imports area: `import type { PersonaBlend } from '@/lib/mentor-types';`

- [ ] **Step 6: Run existing tests and type-check to verify no regressions**

Run: `cd apps/web && npx vitest run src/__tests__/chat-bubble.test.tsx`
Expected: All 5 existing tests PASS

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors (confirms persona-display.tsx import refactor is also valid)

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/mentor-types.ts apps/web/src/lib/mentor-types.test.ts apps/web/src/components/mentors/chat-bubble.tsx apps/web/src/components/mentors/persona-display.tsx
git commit -m "refactor: extract shared PersonaBlend type and getDominantArchetype"
```

---

### Task 2: Add MentorType ↔ MentorArchetype mapping functions

**Files:**
- Modify: `apps/web/src/lib/mentor-archetypes.ts`
- Modify: `apps/web/src/lib/mentor-types.test.ts`

- [ ] **Step 1: Add mapping tests**

Add the new imports at the **top** of `apps/web/src/lib/mentor-types.test.ts` (alongside the existing imports — ESM requires all `import` statements at the top of the file):

```typescript
import { mentorTypeToArchetype, archetypeToMentorType } from './mentor-archetypes';
import { MentorType } from '@life-design/core';
```

Then append these `describe` blocks **after** the existing `getDominantArchetype` describe block:

```typescript
describe('mentorTypeToArchetype', () => {
  it('maps Stoic to therapist', () => {
    expect(mentorTypeToArchetype(MentorType.Stoic)).toBe('therapist');
  });

  it('maps Coach to coach', () => {
    expect(mentorTypeToArchetype(MentorType.Coach)).toBe('coach');
  });

  it('maps Scientist to sage', () => {
    expect(mentorTypeToArchetype(MentorType.Scientist)).toBe('sage');
  });
});

describe('archetypeToMentorType', () => {
  it('maps therapist to Stoic', () => {
    expect(archetypeToMentorType('therapist')).toBe(MentorType.Stoic);
  });

  it('maps coach to Coach', () => {
    expect(archetypeToMentorType('coach')).toBe(MentorType.Coach);
  });

  it('maps sage to Scientist', () => {
    expect(archetypeToMentorType('sage')).toBe(MentorType.Scientist);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/lib/mentor-types.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Add mapping functions to mentor-archetypes.ts**

Add to `apps/web/src/lib/mentor-archetypes.ts`:

```typescript
import { MentorType } from '@life-design/core';

const MENTOR_TYPE_TO_ARCHETYPE: Record<MentorType, MentorArchetype> = {
  [MentorType.Stoic]: 'therapist',
  [MentorType.Coach]: 'coach',
  [MentorType.Scientist]: 'sage',
};

const ARCHETYPE_TO_MENTOR_TYPE: Record<MentorArchetype, MentorType> = {
  therapist: MentorType.Stoic,
  coach: MentorType.Coach,
  sage: MentorType.Scientist,
};

export function mentorTypeToArchetype(type: MentorType): MentorArchetype {
  return MENTOR_TYPE_TO_ARCHETYPE[type];
}

export function archetypeToMentorType(archetype: MentorArchetype): MentorType {
  return ARCHETYPE_TO_MENTOR_TYPE[archetype];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/lib/mentor-types.test.ts`
Expected: 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/mentor-archetypes.ts apps/web/src/lib/mentor-types.test.ts
git commit -m "feat: add bidirectional MentorType to MentorArchetype mapping"
```

---

### Task 3: Extend ArchetypeConfig with visual + voice fields

**Files:**
- Modify: `apps/web/src/lib/mentor-archetypes.ts`

- [ ] **Step 1: Add new fields to ArchetypeConfig interface**

In `apps/web/src/lib/mentor-archetypes.ts`, extend the `ArchetypeConfig` interface:

```typescript
export interface ArchetypeConfig {
  // existing fields stay unchanged
  id: MentorArchetype;
  label: string;
  summary: string;
  characterName: string;
  preferredVoices: string[];
  openingStyle: string;
  affirmationStyle: string;
  promptStyle: string;
  meditationStyle: string;

  // Visual identity
  portraitBasePath: string;
  accentColor: string;
  accentColorMuted: string;

  // ElevenLabs voice
  elevenLabsVoiceId: string;
  elevenLabsModelId: string;
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };

  // Greeting for voice preview
  greetingText: string;
}
```

- [ ] **Step 2: Update ARCHETYPE_CONFIGS entries**

Add the new fields to each config object. For `elevenLabsVoiceId`, use placeholder `'PLACEHOLDER'` — actual IDs selected during ElevenLabs setup.

> **Important**: The `'PLACEHOLDER'` voice IDs must be replaced with real ElevenLabs voice IDs before the `/api/tts` route (Task 6) can be tested end-to-end. The route will make valid API calls but ElevenLabs will return a 404 for an unknown voice ID. During unit testing this is fine (the route is mocked), but for manual/integration testing, update these values first by browsing the ElevenLabs voice library. See spec Section 13 (Open Questions) for selection criteria.

Therapist:
```typescript
portraitBasePath: '/images/mentors/therapist',
accentColor: '#8b5cf6',
accentColorMuted: 'rgba(139,92,246,0.2)',
elevenLabsVoiceId: 'PLACEHOLDER',
elevenLabsModelId: 'eleven_turbo_v2_5',
voiceSettings: { stability: 0.75, similarityBoost: 0.8, style: 0.4, useSpeakerBoost: true },
greetingText: "Hello, I'm Eleanor. Take a breath — there's no rush. I'm here whenever you're ready to talk.",
```

Coach:
```typescript
portraitBasePath: '/images/mentors/coach',
accentColor: '#f59e0b',
accentColorMuted: 'rgba(245,158,11,0.2)',
elevenLabsVoiceId: 'PLACEHOLDER',
elevenLabsModelId: 'eleven_turbo_v2_5',
voiceSettings: { stability: 0.55, similarityBoost: 0.75, style: 0.65, useSpeakerBoost: true },
greetingText: "Hey! I'm Theo. Let's figure out what matters most to you today and make it happen.",
```

Sage:
```typescript
portraitBasePath: '/images/mentors/sage',
accentColor: '#10b981',
accentColorMuted: 'rgba(16,185,129,0.2)',
elevenLabsVoiceId: 'PLACEHOLDER',
elevenLabsModelId: 'eleven_turbo_v2_5',
voiceSettings: { stability: 0.7, similarityBoost: 0.8, style: 0.5, useSpeakerBoost: true },
greetingText: "Welcome. I'm Maya. Let's take a wider view of where you are and where you'd like to go.",
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/mentor-archetypes.ts
git commit -m "feat: extend ArchetypeConfig with portrait, accent color, and ElevenLabs voice settings"
```

---

### Task 4: Add getUserMentorById to mentor-service

**Files:**
- Modify: `apps/web/src/lib/services/mentor-service.ts`
- Modify: `apps/web/src/__tests__/mentor-service.test.ts`

- [ ] **Step 1: Add test for getUserMentorById**

First, add `getUserMentorById` to the existing import statement at the top of `apps/web/src/__tests__/mentor-service.test.ts`:

```typescript
import {
  listMentors,
  activateMentor,
  getUserMentors,
  getChatHistory,
  saveChatMessage,
  getUserMentorById,
} from '@/lib/services/mentor-service';
```

Then append this describe block at the end of the file (the file already has `mockFrom` defined at the top and `beforeEach` clearing mocks):

```typescript
describe('getUserMentorById', () => {
  it('returns user mentor with joined mentor type', async () => {
    const userMentor = {
      id: 'um-1',
      user_id: 'u-1',
      mentor_id: 'm-1',
      is_active: true,
      mentor: { mentor_type: 'stoic' },
    };
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: userMentor, error: null }),
        }),
      }),
    });

    const result = await getUserMentorById('um-1');

    expect(result.data).toEqual(userMentor);
    expect(result.data?.mentor).toEqual({ mentor_type: 'stoic' });
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('user_mentors');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/mentor-service.test.ts`
Expected: FAIL — `getUserMentorById` not exported

- [ ] **Step 3: Implement getUserMentorById**

Add to `apps/web/src/lib/services/mentor-service.ts`:

```typescript
export async function getUserMentorById(userMentorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_mentors')
    .select('*, mentor:mentors(mentor_type)')
    .eq('id', userMentorId)
    .single();
  return { data, error };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/__tests__/mentor-service.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/services/mentor-service.ts apps/web/src/__tests__/mentor-service.test.ts
git commit -m "feat: add getUserMentorById for resolving mentor archetype in chat page"
```

---

## Chunk 2: TTS Server Route & Rate Limiting

### Task 5: Create Supabase migration for tts_rate_limits

**Files:**
- Create: `supabase/migrations/<timestamp>_tts_rate_limits.sql`

- [ ] **Step 1: Create migration file**

Name it with the next sequential timestamp. Run `ls supabase/migrations/` to find the highest existing prefix, then increment by 1 second. Supabase migration filenames use the format `YYYYMMDDHHMMSS_description.sql` (e.g., `20260316120000_tts_rate_limits.sql`).

Content:

```sql
-- TTS rate limiting table for ElevenLabs voice synthesis
CREATE TABLE tts_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tts_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rate limit"
  ON tts_rate_limits
  FOR ALL
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/*_tts_rate_limits.sql
git commit -m "feat: add tts_rate_limits table for serverless-safe TTS rate limiting"
```

---

### Task 6: Implement /api/tts route

**Files:**
- Create: `apps/web/src/app/api/tts/route.ts`
- Create: `apps/web/src/app/api/tts/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests for the TTS route**

```typescript
// apps/web/src/app/api/tts/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockFrom(),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({}),
    }),
  }),
}));

// Mock fetch for ElevenLabs
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('/api/tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = 'test-key';
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: 'No user' });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 503 when API key is not configured', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(503);
  });

  it('returns 400 for missing text', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for text exceeding 5000 chars', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'x'.repeat(5001), archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid archetype', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    mockFrom.mockResolvedValue({ data: null });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'invalid' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: '123' } }, error: null });
    // Simulate a user who has already made 60 requests this hour
    mockFrom.mockResolvedValue({
      data: {
        request_count: 60,
        window_start: new Date().toISOString(), // current window, not expired
      },
    });

    const { POST } = await import('../route');
    const req = new Request('http://localhost/api/tts', {
      method: 'POST',
      body: JSON.stringify({ text: 'Hello', archetype: 'therapist' }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/app/api/tts/__tests__/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the route handler**

Create `apps/web/src/app/api/tts/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getArchetypeConfig, type MentorArchetype } from '@/lib/mentor-archetypes';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const MAX_TEXT_LENGTH = 5000;

interface TTSRequestBody {
  text: string;
  archetype: MentorArchetype;
  speed?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  // 1. Authenticate — route is NOT covered by middleware (/api/* paths are skipped)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check API key
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
  }

  // 3. Parse and validate body
  const body: TTSRequestBody = await request.json();
  const { text, archetype, speed = 1.0 } = body;

  if (!text || !archetype) {
    return NextResponse.json({ error: 'Missing text or archetype' }, { status: 400 });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Text exceeds ${MAX_TEXT_LENGTH} character limit` }, { status: 400 });
  }

  const validArchetypes: MentorArchetype[] = ['therapist', 'coach', 'sage'];
  if (!validArchetypes.includes(archetype)) {
    return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 });
  }

  // 4. Rate limiting via Supabase (survives serverless cold starts)
  const { data: rateData } = await supabase
    .from('tts_rate_limits')
    .select('request_count, window_start')
    .eq('user_id', user.id)
    .single();

  const now = new Date();
  const windowStart = rateData?.window_start ? new Date(rateData.window_start) : null;
  const windowExpired = !windowStart || (now.getTime() - windowStart.getTime() > 3600_000);

  if (!windowExpired && rateData && rateData.request_count >= 60) {
    return NextResponse.json({ error: 'Rate limit exceeded (60/hour)' }, { status: 429 });
  }

  await supabase.from('tts_rate_limits').upsert({
    user_id: user.id,
    request_count: windowExpired ? 1 : (rateData?.request_count ?? 0) + 1,
    window_start: windowExpired ? now.toISOString() : rateData?.window_start,
  });

  // 5. Call ElevenLabs
  const config = getArchetypeConfig(archetype);

  const elevenLabsResponse = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${config.elevenLabsVoiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: config.elevenLabsModelId,
        voice_settings: {
          stability: config.voiceSettings.stability,
          similarity_boost: config.voiceSettings.similarityBoost,
          style: config.voiceSettings.style,
          use_speaker_boost: config.voiceSettings.useSpeakerBoost,
        },
        ...(speed !== 1.0 ? { speed } : {}),
      }),
    }
  );

  if (!elevenLabsResponse.ok || !elevenLabsResponse.body) {
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: elevenLabsResponse.status }
    );
  }

  // 6. Stream audio back to client
  return new Response(elevenLabsResponse.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/app/api/tts/__tests__/route.test.ts`
Expected: All 6 tests PASS (5 validation + 1 rate limit)

- [ ] **Step 5: Add env variable to .env.example**

Add to `.env.example`:
```
# Optional: ElevenLabs API key for AI voice synthesis
# Without this, mentors fall back to browser speech synthesis
ELEVENLABS_API_KEY=
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/tts/route.ts apps/web/src/app/api/tts/__tests__/route.test.ts .env.example
git commit -m "feat: add /api/tts route with ElevenLabs proxy, auth, and rate limiting"
```

---

## Chunk 3: Client-Side TTS Hook

### Task 7: Implement useElevenLabsTTS hook

**Files:**
- Create: `apps/web/src/hooks/useElevenLabsTTS.ts`
- Create: `apps/web/src/hooks/__tests__/useElevenLabsTTS.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/web/src/hooks/__tests__/useElevenLabsTTS.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useElevenLabsTTS } from '../useElevenLabsTTS';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLAudioElement
const mockPlay = vi.fn().mockResolvedValue(undefined);
const mockPause = vi.fn();
global.Audio = vi.fn().mockImplementation(() => ({
  play: mockPlay,
  pause: mockPause,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
})) as any;

describe('useElevenLabsTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useElevenLabsTTS());
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading during fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    const { result } = renderHook(() => useElevenLabsTTS());

    await act(async () => {
      result.current.speak('Hello', 'therapist');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('calls stop before new speak', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mpeg' })),
    });

    const { result } = renderHook(() => useElevenLabsTTS());

    await act(async () => {
      result.current.speak('Hello', 'therapist');
    });

    // Second speak should work without error (previous aborted)
    await act(async () => {
      result.current.speak('World', 'coach');
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to browser TTS on 503', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    // Mock speechSynthesis
    const mockSpeak = vi.fn();
    global.speechSynthesis = { speak: mockSpeak, cancel: vi.fn(), getVoices: () => [] } as any;
    global.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({
      voice: null,
      rate: 1,
      pitch: 1,
      volume: 1,
      onend: null,
      onerror: null,
    })) as any;

    const { result } = renderHook(() => useElevenLabsTTS({ fallbackToBrowser: true }));

    await act(async () => {
      result.current.speak('Hello', 'therapist');
    });

    expect(mockSpeak).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/hooks/__tests__/useElevenLabsTTS.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the hook**

Create `apps/web/src/hooks/useElevenLabsTTS.ts`:

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import type { MentorArchetype } from '@/lib/mentor-archetypes';
import { getArchetypeConfig } from '@/lib/mentor-archetypes';

interface UseElevenLabsTTSOptions {
  speed?: number;
  fallbackToBrowser?: boolean;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
}

interface UseElevenLabsTTSReturn {
  speak: (text: string, archetype: MentorArchetype) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useElevenLabsTTS(options: UseElevenLabsTTSOptions = {}): UseElevenLabsTTSReturn {
  const { speed = 1.0, fallbackToBrowser = true, onSpeakStart, onSpeakEnd } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const fallbackSpeak = useCallback((text: string, archetype: MentorArchetype) => {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const config = getArchetypeConfig(archetype);
    const voices = speechSynthesis.getVoices();
    // Try to match preferred voice
    for (const pref of config.preferredVoices) {
      const match = voices.find(v => v.name.includes(pref) || v.lang.includes(pref));
      if (match) { utterance.voice = match; break; }
    }
    utterance.rate = 0.88;
    utterance.onstart = () => { setIsSpeaking(true); onSpeakStart?.(); };
    utterance.onend = () => { setIsSpeaking(false); onSpeakEnd?.(); };
    utterance.onerror = () => { setIsSpeaking(false); onSpeakEnd?.(); };
    speechSynthesis.speak(utterance);
  }, [onSpeakStart, onSpeakEnd]);

  const speak = useCallback(async (text: string, archetype: MentorArchetype) => {
    stop();
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, archetype, speed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (fallbackToBrowser) {
          setIsLoading(false);
          fallbackSpeak(text, archetype);
          return;
        }
        throw new Error(`TTS failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('play', () => {
        setIsLoading(false);
        setIsSpeaking(true);
        onSpeakStart?.();
      });
      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        onSpeakEnd?.();
        URL.revokeObjectURL(url);
        blobUrlRef.current = null;
      });
      audio.addEventListener('error', () => {
        setIsSpeaking(false);
        setIsLoading(false);
        onSpeakEnd?.();
      });

      await audio.play();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err as Error);
      setIsLoading(false);
      if (fallbackToBrowser) {
        fallbackSpeak(text, archetype);
      }
    }
  }, [stop, speed, fallbackToBrowser, fallbackSpeak, onSpeakStart, onSpeakEnd]);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return { speak, stop, isSpeaking, isLoading, error };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/hooks/__tests__/useElevenLabsTTS.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useElevenLabsTTS.ts apps/web/src/hooks/__tests__/useElevenLabsTTS.test.ts
git commit -m "feat: add useElevenLabsTTS hook with blob playback and browser TTS fallback"
```

---

## Chunk 4: Mentor Avatar & Chat UI

### Task 8: Create MentorAvatar component

**Files:**
- Create: `apps/web/src/components/mentors/mentor-avatar.tsx`
- Create: `apps/web/src/components/mentors/__tests__/mentor-avatar.test.tsx`
- Create: placeholder portrait images in `public/images/mentors/`

- [ ] **Step 1: Create placeholder portrait images**

Generate 1x1 pixel WebP placeholders (will be replaced with real art):

```bash
mkdir -p public/images/mentors/therapist public/images/mentors/coach public/images/mentors/sage
```

Use a simple script or manually create 48px and 96px solid-color placeholder WebP images:
- `therapist/` — violet (#8b5cf6)
- `coach/` — amber (#f59e0b)
- `sage/` — emerald (#10b981)

Alternatively, generate SVG placeholders as `.webp` using ImageMagick or a canvas script. The exact method is flexible — these are temporary.

> **Note**: The spec (Section 2.2) lists three portrait sizes: 32px, 48px, and 96px. The 32px size is intentionally deferred — the `MentorAvatar` component only uses 48px and 96px (the `sm` size maps to 32px but uses the 48px image). Create only 48px and 96px placeholders now.

Verify the directories and files exist:

Run: `ls public/images/mentors/therapist/ public/images/mentors/coach/ public/images/mentors/sage/`
Expected: Each directory contains `portrait-48.webp` and `portrait-96.webp`

- [ ] **Step 2: Write failing test for MentorAvatar**

```typescript
// apps/web/src/components/mentors/__tests__/mentor-avatar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MentorAvatar from '../mentor-avatar';

describe('MentorAvatar', () => {
  it('renders with idle state', () => {
    const { container } = render(
      <MentorAvatar archetype="therapist" state="idle" size="sm" />
    );
    expect(container.querySelector('img')).toBeDefined();
  });

  it('applies speaking animation class', () => {
    const { container } = render(
      <MentorAvatar archetype="coach" state="speaking" size="md" />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/speaking/);
  });

  it('applies thinking animation class', () => {
    const { container } = render(
      <MentorAvatar archetype="sage" state="thinking" size="md" />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/thinking/);
  });

  it('renders correct size', () => {
    const { container } = render(
      <MentorAvatar archetype="therapist" state="idle" size="lg" />
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/h-24|w-24/);
  });

  it('falls back to gradient orb on image error', () => {
    const { container } = render(
      <MentorAvatar archetype="therapist" state="idle" size="sm" />
    );
    // Simulate image error
    const img = container.querySelector('img');
    if (img) img.dispatchEvent(new Event('error'));
    // Should show fallback div
    const fallback = container.querySelector('[data-testid="avatar-fallback"]');
    expect(fallback).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/components/mentors/__tests__/mentor-avatar.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement MentorAvatar**

Create `apps/web/src/components/mentors/mentor-avatar.tsx`:

```typescript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getArchetypeConfig, type MentorArchetype } from '@/lib/mentor-archetypes';
import type { MentorAvatarState } from '@/lib/mentor-types';

interface MentorAvatarProps {
  archetype: MentorArchetype;
  state: MentorAvatarState;
  size: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { px: 32, cls: 'h-8 w-8' },
  md: { px: 48, cls: 'h-12 w-12' },
  lg: { px: 96, cls: 'h-24 w-24' },
} as const;

export default function MentorAvatar({ archetype, state, size, className = '' }: MentorAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const config = getArchetypeConfig(archetype);
  const { px, cls } = SIZE_MAP[size];
  const imgSize = px <= 48 ? 48 : 96;

  const stateClass =
    state === 'speaking' ? 'speaking animate-mentor-speaking' :
    state === 'thinking' ? 'thinking animate-mentor-breathing' :
    '';

  if (imgError) {
    return (
      <div
        data-testid="avatar-fallback"
        className={`${cls} rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${stateClass} ${className}`}
        style={{ background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColorMuted})` }}
        aria-label={`${config.characterName} avatar`}
      >
        {config.characterName[0]}
      </div>
    );
  }

  return (
    <div
      className={`${cls} rounded-full overflow-hidden flex-shrink-0 ring-2 ${stateClass} ${className}`}
      style={{
        '--accent': config.accentColor,
        '--accent-muted': config.accentColorMuted,
        '--tw-ring-color': state === 'idle' ? config.accentColorMuted : config.accentColor,
      } as React.CSSProperties}
      aria-label={`${config.characterName} avatar — ${state}`}
    >
      <Image
        src={`${config.portraitBasePath}/portrait-${imgSize}.webp`}
        alt={config.characterName}
        width={px}
        height={px}
        className="object-cover"
        priority={size === 'md'}
        onError={() => setImgError(true)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run src/components/mentors/__tests__/mentor-avatar.test.tsx`
Expected: All 5 tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/mentors/mentor-avatar.tsx apps/web/src/components/mentors/__tests__/mentor-avatar.test.tsx public/images/mentors/
git commit -m "feat: add MentorAvatar component with idle/thinking/speaking states"
```

---

### Task 9: Update ChatBubble to use MentorAvatar and add speak button

**Files:**
- Modify: `apps/web/src/components/mentors/chat-bubble.tsx`
- Modify: `apps/web/src/__tests__/chat-bubble.test.tsx`

- [ ] **Step 1: Add new tests for archetype and speak functionality**

Append to `apps/web/src/__tests__/chat-bubble.test.tsx`:

```typescript
it('renders MentorAvatar for assistant messages when archetype is provided', () => {
  const { container } = render(
    <ChatBubble role="assistant" content="Hello" archetype="therapist" />
  );
  expect(container.querySelector('[aria-label*="Eleanor"]')).not.toBeNull();
});

it('renders speak button for assistant messages when onSpeak is provided', () => {
  const onSpeak = vi.fn();
  render(
    <ChatBubble role="assistant" content="Hello" archetype="therapist" onSpeak={onSpeak} />
  );
  const speakBtn = screen.getByLabelText('Speak this message');
  expect(speakBtn).toBeDefined();
});

it('renders TypingIndicator with MentorAvatar in thinking state', () => {
  const { container } = render(
    <TypingIndicator archetype="sage" />
  );
  expect(container.querySelector('[aria-label*="Maya"]')).not.toBeNull();
  expect(container.querySelector('[aria-label*="thinking"]')).not.toBeNull();
});
```

Note: Import `TypingIndicator` alongside `ChatBubble` in the test file if it's exported as a named export.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/__tests__/chat-bubble.test.tsx`
Expected: FAIL — props not recognized

- [ ] **Step 3: Update ChatBubble component**

In `apps/web/src/components/mentors/chat-bubble.tsx`:
1. Add to `ChatBubbleProps`: `archetype?: MentorArchetype`, `onSpeak?: (text: string) => void`, `speakingMessageId?: string`, `messageId?: string`
2. Replace the gradient "M" `<div>` (lines 176-184) with:
   ```tsx
   {archetype ? (
     <MentorAvatar
       archetype={archetype}
       state={speakingMessageId === messageId ? 'speaking' : 'idle'}
       size="sm"
     />
   ) : (
     <div
       className="h-8 w-8 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-white"
       style={{ background: gradient }}
       title={personaLabel(blend)}
       aria-label={`Mentor persona: ${personaLabel(blend)}`}
     >
       M
     </div>
   )}
   ```
3. Add speak button in the assistant message footer (next to thumbs up/down):
   ```tsx
   {onSpeak && (
     <button
       onClick={() => onSpeak(content)}
       className="p-1.5 rounded-lg text-white/25 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all duration-200"
       aria-label="Speak this message"
     >
       <Volume2 className="h-3.5 w-3.5" />
     </button>
   )}
   ```
4. Update `TypingIndicator` to accept `archetype` prop and use `MentorAvatar` with `state="thinking"`.

- [ ] **Step 4: Run all chat bubble tests**

Run: `cd apps/web && npx vitest run src/__tests__/chat-bubble.test.tsx`
Expected: All 8 tests PASS (5 existing + 3 new: avatar, speak button, typing indicator)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/mentors/chat-bubble.tsx apps/web/src/__tests__/chat-bubble.test.tsx
git commit -m "feat: replace gradient orb with MentorAvatar in ChatBubble, add speak button"
```

---

### Task 10: Wire TTS and archetype into ChatClient

**Files:**
- Modify: `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/page.tsx`
- Modify: `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/chat-client.tsx`

- [ ] **Step 1: Update page.tsx to resolve archetype**

Replace content of `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/page.tsx`:

```typescript
import { MentorType } from '@life-design/core';
import { getChatHistory, getUserMentorById } from '@/lib/services/mentor-service';
import { mentorTypeToArchetype, getArchetypeConfig } from '@/lib/mentor-archetypes';
import ChatClient from './chat-client';

interface ChatPageProps {
  params: Promise<{ userMentorId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { userMentorId } = await params;
  const [{ data: messages }, { data: userMentor }] = await Promise.all([
    getChatHistory(userMentorId, 100),
    getUserMentorById(userMentorId),
  ]);

  // Safe fallback: MentorType is a string enum (Stoic = 'stoic'), so 'stoic' is a valid value
  const mentorType = (userMentor?.mentor?.mentor_type ?? 'stoic') as MentorType;
  const archetype = mentorTypeToArchetype(mentorType);
  const config = getArchetypeConfig(archetype);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-4">
      <ChatClient
        userMentorId={userMentorId}
        initialMessages={
          (messages ?? []).map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }))
        }
        mentorName={config.characterName}
        archetype={archetype}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update chat-client.tsx**

Apply these changes to `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/chat-client.tsx`:

**2a. Update props and imports** — add at the top:
```typescript
import type { MentorArchetype } from '@/lib/mentor-archetypes';
import { archetypeToMentorType } from '@/lib/mentor-archetypes';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import MentorAvatar from '@/components/mentors/mentor-avatar';
```

Update `ChatClientProps`:
```typescript
interface ChatClientProps {
  userMentorId: string;
  initialMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  mentorName?: string;
  archetype: MentorArchetype;  // NEW
}
```

**2b. Wire TTS hook and state** — inside the component, add:
```typescript
// Voice settings from localStorage
const [voiceEnabled, setVoiceEnabled] = useState(false);
const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(true);
const [voiceSpeed, setVoiceSpeed] = useState(1.0);
const [speakingMessageIdx, setSpeakingMessageIdx] = useState<number | null>(null);

useEffect(() => {
  setVoiceEnabled(localStorage.getItem('ld:voice-enabled') === 'true');
  setVoiceAutoSpeak(localStorage.getItem('ld:voice-auto-speak') !== 'false');
  const saved = localStorage.getItem('ld:voice-speed');
  if (saved) setVoiceSpeed(parseFloat(saved));
}, []);

const { speak, stop, isSpeaking, isLoading: ttsLoading } = useElevenLabsTTS({
  speed: voiceSpeed,
  onSpeakStart: () => {},
  onSpeakEnd: () => setSpeakingMessageIdx(null),
});

const handleSpeak = useCallback((text: string, idx: number) => {
  setSpeakingMessageIdx(idx);
  speak(text, archetype);
}, [speak, archetype]);
```

**2c. Fix hardcoded 'stoic'** — on line 116 (the `sendMessage` call), replace:
```typescript
// BEFORE:
sendMessage(userMentorId, 'stoic', content)
// AFTER:
sendMessage(userMentorId, archetypeToMentorType(archetype), content)
```

**2d. Auto-speak logic** — place this inside the existing response handler (the callback that fires after `sendMessage` returns the assistant's response text). The existing code already has a variable tracking the message type (`type` field in the messages array — `'text'` or `'voice'`), and `messages` is the local state array of chat messages:
```typescript
// After appending the assistant response to messages state:
const lastUserMsg = messages.findLast(m => m.role === 'user');
const wasVoiceInput = lastUserMsg?.type === 'voice';
if (voiceEnabled || wasVoiceInput) {
  speak(responseText, archetype);
  setSpeakingMessageIdx(messages.length); // index of the just-appended response
}
```

**2e. Update ChatBubble rendering** — pass new props to each assistant message bubble:
```tsx
<ChatBubble
  key={idx}
  role={msg.role}
  content={msg.content}
  archetype={msg.role === 'assistant' ? archetype : undefined}
  onSpeak={msg.role === 'assistant' ? (text) => handleSpeak(text, idx) : undefined}
  speakingMessageId={speakingMessageIdx === idx ? String(idx) : undefined}
  messageId={String(idx)}
  // ... existing props
/>
```

**2f. Update header** — replace "Your Mentor" header with:
```tsx
<MentorAvatar archetype={archetype} state={isSpeaking ? 'speaking' : 'idle'} size="md" />
<div>
  <h1 className="text-lg font-semibold">{mentorName}</h1>
  <p className="text-xs text-white/50">{isSpeaking ? 'Speaking...' : archetype}</p>
</div>
```

**2g. Update TypingIndicator** — pass archetype:
```tsx
<TypingIndicator archetype={archetype} />
```

- [ ] **Step 3: Verify TypeScript compiles and existing tests pass**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

Run: `cd apps/web && npx vitest run`
Expected: All tests pass (catches regressions from ChatBubble and service changes)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(protected)/mentors/[userMentorId]/chat/page.tsx apps/web/src/app/(protected)/mentors/[userMentorId]/chat/chat-client.tsx
git commit -m "feat: wire archetype resolution and ElevenLabs TTS into mentor chat"
```

---

## Chunk 5: Mentor Card & Voice Settings

### Task 11: Redesign MentorCard with portrait and voice preview

**Files:**
- Modify: `apps/web/src/components/mentors/mentor-card.tsx`
- Modify: `apps/web/src/__tests__/mentor-card.test.tsx`

- [ ] **Step 1: Add tests for new card features**

Add to `apps/web/src/__tests__/mentor-card.test.tsx` (inside the existing `describe('MentorCard')` block, which already defines `const mentor = { id: 'm-1', name: 'The Stoic', type: 'stoic', ... }`):

```typescript
it('renders character portrait image', () => {
  const { container } = render(
    <MentorCard mentor={mentor} onActivate={vi.fn()} />
  );
  expect(container.querySelector('img')).not.toBeNull();
});

it('renders voice preview button', () => {
  render(<MentorCard mentor={mentor} onActivate={vi.fn()} />);
  expect(screen.getByLabelText(/hear voice/i)).toBeDefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/__tests__/mentor-card.test.tsx`
Expected: FAIL — new assertions fail

- [ ] **Step 3: Update MentorCard component**

Redesign `apps/web/src/components/mentors/mentor-card.tsx`:

1. Import the mapping function and derive archetype inside the component from the mentor's type:
   ```typescript
   import { mentorTypeToArchetype, getArchetypeConfig } from '@/lib/mentor-archetypes';
   import { MentorType } from '@life-design/core';
   // Inside component:
   const archetype = mentorTypeToArchetype(mentor.type as MentorType);
   const config = getArchetypeConfig(archetype);
   ```
2. Add `MentorAvatar` with `size="lg"` (uses `portrait-96.webp`) as card hero
3. Add "Hear Voice" button with `aria-label={`Hear ${config.characterName}'s voice`}` that calls `speak(config.greetingText, archetype)` via `useElevenLabsTTS`
4. Show archetype label subtitle (e.g., "Compassionate Therapist")
5. Keep existing activate/chat buttons

- [ ] **Step 4: Run all mentor card tests**

Run: `cd apps/web && npx vitest run src/__tests__/mentor-card.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/mentors/mentor-card.tsx apps/web/src/__tests__/mentor-card.test.tsx
git commit -m "feat: redesign MentorCard with portrait and voice preview"
```

---

### Task 12: Add VoiceSettingsPanel to Settings

**Files:**
- Create: `apps/web/src/components/settings/VoiceSettingsPanel.tsx`
- Modify: `apps/web/src/app/(protected)/settings/settings-client.tsx`

- [ ] **Step 1: Create VoiceSettingsPanel**

```typescript
// apps/web/src/components/settings/VoiceSettingsPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { ARCHETYPE_CONFIGS, type MentorArchetype } from '@/lib/mentor-archetypes';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';

export default function VoiceSettingsPanel() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const { speak, isSpeaking, stop } = useElevenLabsTTS({ speed: voiceSpeed });

  useEffect(() => {
    setVoiceEnabled(localStorage.getItem('ld:voice-enabled') === 'true');
    setAutoSpeak(localStorage.getItem('ld:voice-auto-speak') !== 'false');
    const savedSpeed = localStorage.getItem('ld:voice-speed');
    if (savedSpeed) setVoiceSpeed(parseFloat(savedSpeed));
  }, []);

  function toggleVoice(val: boolean) {
    setVoiceEnabled(val);
    localStorage.setItem('ld:voice-enabled', String(val));
  }

  function toggleAutoSpeak(val: boolean) {
    setAutoSpeak(val);
    localStorage.setItem('ld:voice-auto-speak', String(val));
  }

  function updateSpeed(val: number) {
    setVoiceSpeed(val);
    localStorage.setItem('ld:voice-speed', String(val));
  }

  function preview(archetype: MentorArchetype) {
    const config = ARCHETYPE_CONFIGS.find(c => c.id === archetype);
    if (config) {
      if (isSpeaking) stop();
      else speak(config.greetingText, archetype);
    }
  }

  // Earthy settings color scheme: bg-[#F5F3EF] cards, text-[#2A2623] headings, border-[#E8E4DD]
  return (
    <div className="space-y-4">
      {/* Toggle: Speak mentor responses */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-[#2A2623]">Speak mentor responses aloud</span>
        <input
          type="checkbox"
          checked={voiceEnabled}
          onChange={(e) => toggleVoice(e.target.checked)}
          className="h-4 w-4 accent-[#5A7F5A]"
        />
      </label>

      {/* Toggle: Auto-speak in voice conversations */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-[#2A2623]">Auto-speak in voice conversations</span>
        <input
          type="checkbox"
          checked={autoSpeak}
          onChange={(e) => toggleAutoSpeak(e.target.checked)}
          className="h-4 w-4 accent-[#5A7F5A]"
        />
      </label>

      {/* Slider: Voice speed 0.75x - 1.25x */}
      <div>
        <label className="text-sm text-[#2A2623]">
          Voice speed: {voiceSpeed.toFixed(2)}x
        </label>
        <input
          type="range"
          min={0.75}
          max={1.25}
          step={0.05}
          value={voiceSpeed}
          onChange={(e) => updateSpeed(parseFloat(e.target.value))}
          className="w-full accent-[#5A7F5A]"
        />
      </div>

      {/* Preview cards for each mentor */}
      <div className="space-y-2 border-t border-[#E8E4DD] pt-4">
        <p className="text-xs font-medium text-[#A8A198] uppercase tracking-wide">Voice Previews</p>
        {ARCHETYPE_CONFIGS.map((config) => (
          <div
            key={config.id}
            className="flex items-center justify-between rounded-lg bg-[#F5F3EF] px-3 py-2 border border-[#E8E4DD]"
          >
            <span className="text-sm text-[#2A2623]">{config.characterName}</span>
            <button
              onClick={() => preview(config.id)}
              className="flex items-center gap-1 text-xs text-[#5A7F5A] hover:text-[#4a6f4a]"
              aria-label={`Preview ${config.characterName}'s voice`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              {isSpeaking ? 'Stop' : 'Preview'}
            </button>
          </div>
        ))}
      </div>

      {/* Data usage note */}
      <p className="text-xs text-[#A8A198]">
        Voice responses use approximately 50–100KB per message via ElevenLabs.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write tests for VoiceSettingsPanel**

Create `apps/web/src/components/settings/__tests__/VoiceSettingsPanel.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceSettingsPanel from '../VoiceSettingsPanel';

// Mock useElevenLabsTTS
vi.mock('@/hooks/useElevenLabsTTS', () => ({
  useElevenLabsTTS: () => ({
    speak: vi.fn(),
    stop: vi.fn(),
    isSpeaking: false,
    isLoading: false,
    error: null,
  }),
}));

describe('VoiceSettingsPanel', () => {
  it('renders voice toggle', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText('Speak mentor responses aloud')).toBeDefined();
  });

  it('renders speed slider', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText(/voice speed/i)).toBeDefined();
  });

  it('renders preview buttons for all three mentors', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByLabelText(/preview eleanor/i)).toBeDefined();
    expect(screen.getByLabelText(/preview theo/i)).toBeDefined();
    expect(screen.getByLabelText(/preview maya/i)).toBeDefined();
  });

  it('renders data usage note', () => {
    render(<VoiceSettingsPanel />);
    expect(screen.getByText(/50–100KB/)).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd apps/web && npx vitest run src/components/settings/__tests__/VoiceSettingsPanel.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 4: Add VoiceSettingsPanel to settings-client.tsx**

In `apps/web/src/app/(protected)/settings/settings-client.tsx`, add import and render `VoiceSettingsPanel` as a new `SectionCard` with title "Voice & Personality". Place it **after** the "AI Features" section and **before** the "Mentor Memory" section — voice settings are AI-adjacent and should be grouped near AI features.

- [ ] **Step 5: Verify the settings page renders**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/settings/VoiceSettingsPanel.tsx apps/web/src/components/settings/__tests__/VoiceSettingsPanel.test.tsx apps/web/src/app/(protected)/settings/settings-client.tsx
git commit -m "feat: add Voice & Personality settings panel with speed slider and previews"
```

---

### Task 13: Add clarifying comment to config/assets.ts

**Files:**
- Modify: `apps/web/src/config/assets.ts`

- [ ] **Step 1: Add comment above voiceSamples**

Add comment before `export const voiceSamples` in `apps/web/src/config/assets.ts`:

```typescript
/**
 * Pre-recorded voice samples for the cinematic onboarding experience.
 * These are CDN-hosted MP3 files with static content — NOT part of the
 * ElevenLabs mentor voice system. The mentor voice system uses real-time
 * TTS via /api/tts and the useElevenLabsTTS hook.
 */
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/config/assets.ts
git commit -m "docs: clarify voiceSamples is for cinematic experience, not mentor TTS"
```

---

### Task 14: Final integration test

- [ ] **Step 1: Run the full test suite**

Run: `cd apps/web && npx vitest run`
Expected: All tests pass, no regressions

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify the app builds**

Run: `cd apps/web && npx next build`
Expected: Builds without errors

- [ ] **Step 4: Final commit if any remaining changes**

Run `git status` first. If there are unstaged changes, stage only the relevant files by name (do NOT use `git add -A` which can accidentally include unrelated files):

```bash
git status
# Then stage only the changed files:
git add <specific files listed by git status>
git commit -m "chore: final integration verification for voice mentors feature"
```
