# Anthropomorphised Voice Mentors with ElevenLabs — Design Spec

**Date:** 2026-03-16
**Status:** Rev 2
**Companion to:** `2026-03-16-predictive-engine-design.md`

---

## 1. Overview

Transform the three mentor archetypes (Eleanor/Therapist, Theo/Coach, Maya/Sage) from text-only chat interfaces with generic gradient avatars into fully anthropomorphised voice characters with distinct visual identities, ElevenLabs-powered voices, and state-driven animations.

### Current State

- **Personas**: `packages/ai/src/personas.ts` defines `PERSONA_CONFIGS` with system prompts for Stoic (Therapist), Coach, and Scientist (Sage).
- **Archetypes**: `apps/web/src/lib/mentor-archetypes.ts` defines `ArchetypeConfig` with character names (Eleanor, Theo, Maya), preferred browser voices, and style descriptions.
- **Voice**: Browser `SpeechSynthesisUtterance` via `useSpeechSynthesis` hook — robotic, no personality. Only used in onboarding flow.
- **Visual**: Generic gradient "M" orb in `ChatBubble` (line 176-184 of `chat-bubble.tsx`). No character portraits or illustrations.
- **Chat**: Text-based streaming via Gemini through `sendMessage` server action. Voice input supported via `VoiceRecorder` component (user → app only). No voice output (app → user) in the chat flow.
- **Asset system**: `config/assets.ts` has `VoiceSample` type and CDN audio infrastructure with `preloadVoiceSamples()`. Currently stores pre-recorded MP3s for 4 voice IDs (sage, coach, zen, scholar) — naming doesn't align with archetypes.

### Target State

Each mentor is a distinct character with:
- An illustrated portrait that replaces the "M" orb
- A real AI voice via ElevenLabs streaming TTS
- State-driven avatar animations (idle, thinking, speaking)
- Automatic voice conversation flow (voice in → voice out)

---

## 2. Character Identity System

### 2.1 Character Profiles

| Character | Archetype | Archetype Key | Voice Profile | Visual Palette | Personality Keywords |
|-----------|-----------|---------------|---------------|----------------|---------------------|
| **Eleanor** | Compassionate Therapist | `therapist` | Calm British female, measured pace, warm low register | Muted violet/lavender | Validating, reflective, grounding |
| **Theo** | Focused Coach | `coach` | Warm American male, confident mid-register, energizing cadence | Amber/gold | Motivating, clear, action-oriented |
| **Maya** | Reflective Sage | `sage` | Soft Australian female, thoughtful pace, contemplative tone | Emerald/teal | Wise, spacious, pattern-seeking |

### 2.2 Visual Identity

Each character has an **illustrated portrait** — stylised, not photorealistic, not 3D. The art style should be warm, approachable, and consistent across all three characters (same artist/generation style).

**Required assets per character:**
- `portrait-96.webp` — 96×96px, used in mentor cards and chat headers
- `portrait-48.webp` — 48×48px, used as chat bubble avatar
- `portrait-32.webp` — 32×32px, used in compact persona display

**Asset storage**: `public/images/mentors/{archetype}/portrait-{size}.webp`

Example paths:
```
public/images/mentors/therapist/portrait-96.webp
public/images/mentors/therapist/portrait-48.webp
public/images/mentors/therapist/portrait-32.webp
public/images/mentors/coach/portrait-96.webp
...
```

### 2.3 Archetype Config Extension

Extend the existing `ArchetypeConfig` in `apps/web/src/lib/mentor-archetypes.ts`:

```typescript
export interface ArchetypeConfig {
  // ... existing fields ...
  id: MentorArchetype;
  label: string;
  summary: string;
  characterName: string;
  preferredVoices: string[];        // browser TTS fallback
  openingStyle: string;
  affirmationStyle: string;
  promptStyle: string;
  meditationStyle: string;

  // NEW: Visual identity
  portraitBasePath: string;          // e.g. '/images/mentors/therapist'
  accentColor: string;              // CSS color for ring/glow
  accentColorMuted: string;         // Lower opacity variant

  // NEW: ElevenLabs voice
  elevenLabsVoiceId: string;        // ElevenLabs voice ID
  elevenLabsModelId: string;        // e.g. 'eleven_turbo_v2_5' — validate against current API at implementation time
  voiceSettings: {
    stability: number;              // 0.0-1.0
    similarityBoost: number;        // 0.0-1.0
    style: number;                  // 0.0-1.0
    useSpeakerBoost: boolean;
  };

  // NEW: Greeting text for voice preview
  greetingText: string;
}
```

Concrete values:

```typescript
{
  id: 'therapist',
  // ... existing ...
  portraitBasePath: '/images/mentors/therapist',
  accentColor: '#8b5cf6',           // violet-500
  accentColorMuted: 'rgba(139,92,246,0.2)',
  elevenLabsVoiceId: '<to-be-selected>',
  elevenLabsModelId: 'eleven_turbo_v2_5',
  voiceSettings: {
    stability: 0.75,
    similarityBoost: 0.8,
    style: 0.4,
    useSpeakerBoost: true,
  },
  greetingText: "Hello, I'm Eleanor. Take a breath — there's no rush. I'm here whenever you're ready to talk.",
}
```

```typescript
{
  id: 'coach',
  // ... existing ...
  portraitBasePath: '/images/mentors/coach',
  accentColor: '#f59e0b',           // amber-500
  accentColorMuted: 'rgba(245,158,11,0.2)',
  elevenLabsVoiceId: '<to-be-selected>',
  elevenLabsModelId: 'eleven_turbo_v2_5',
  voiceSettings: {
    stability: 0.55,
    similarityBoost: 0.75,
    style: 0.65,
    useSpeakerBoost: true,
  },
  greetingText: "Hey! I'm Theo. Let's figure out what matters most to you today and make it happen.",
}
```

```typescript
{
  id: 'sage',
  // ... existing ...
  portraitBasePath: '/images/mentors/sage',
  accentColor: '#10b981',           // emerald-500
  accentColorMuted: 'rgba(16,185,129,0.2)',
  elevenLabsVoiceId: '<to-be-selected>',
  elevenLabsModelId: 'eleven_turbo_v2_5',
  voiceSettings: {
    stability: 0.7,
    similarityBoost: 0.8,
    style: 0.5,
    useSpeakerBoost: true,
  },
  greetingText: "Welcome. I'm Maya. Let's take a wider view of where you are and where you'd like to go.",
}
```

> **Note**: `elevenLabsVoiceId` values will be selected during implementation by browsing the ElevenLabs voice library for voices matching each profile. The IDs above are placeholders.

---

## 3. ElevenLabs Voice Integration

### 3.1 Architecture

```
┌─────────────┐    text     ┌──────────────────┐   stream   ┌──────────────┐
│  Gemini API  │ ─────────→ │  /api/tts/route   │ ────────→ │  Client Audio │
│  (existing)  │            │  (Next.js proxy)   │  chunked  │  Playback     │
└─────────────┘            └──────────────────┘  MP3/PCM   └──────────────┘
                                    │
                                    │ POST /v1/text-to-speech/{voice_id}/stream
                                    ▼
                           ┌──────────────────┐
                           │  ElevenLabs API   │
                           └──────────────────┘
```

The server-side proxy pattern keeps the `ELEVENLABS_API_KEY` secure. The client never directly contacts ElevenLabs.

### 3.2 Server-Side Proxy Route

**File**: `apps/web/src/app/api/tts/route.ts`

> **Critical auth note**: The existing middleware in `middleware.ts` skips auth checks for `/api/*` routes (via `isAssetOrInternalPath` in `route-guard.ts`). This route MUST perform its own authentication inline — do NOT rely on middleware.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getArchetypeConfig, type MentorArchetype } from '@/lib/mentor-archetypes';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const MAX_TEXT_LENGTH = 5000;

interface TTSRequestBody {
  text: string;
  archetype: MentorArchetype;
  speed?: number;    // 0.75 - 1.25, default 1.0
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  // 1. Authenticate — route is NOT covered by middleware
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
  //    Uses a simple upsert into a `tts_rate_limits` table:
  //    CREATE TABLE tts_rate_limits (
  //      user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  //      request_count INT DEFAULT 1,
  //      window_start TIMESTAMPTZ DEFAULT now()
  //    );
  //    See Section 3.5 for full schema.
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

  // Upsert: reset window if expired, increment otherwise
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

### 3.5 Rate Limiting Schema

Since the app deploys to Vercel (serverless), in-memory rate limiting is unreliable. Use a lightweight Supabase table:

```sql
CREATE TABLE tts_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only read/write their own row
ALTER TABLE tts_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rate limit" ON tts_rate_limits
  FOR ALL USING (auth.uid() = user_id);
```

This adds one small read + one upsert per TTS request (~5ms overhead). The window resets hourly per user.

> **Known trade-off**: The read-then-upsert pattern is not atomic — concurrent requests from the same user could both read count=59 and both proceed, allowing a few extra requests beyond the 60/hour limit. For a per-user rate limit on a non-adversarial consumer product, this is acceptable. An atomic `UPDATE ... RETURNING` approach would eliminate the race but adds complexity not warranted here.

### 3.3 Client-Side TTS Hook

**File**: `apps/web/src/hooks/useElevenLabsTTS.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import type { MentorArchetype } from '@/lib/mentor-archetypes';

interface UseElevenLabsTTSOptions {
  speed?: number;                        // 0.75-1.25
  fallbackToBrowser?: boolean;           // default: true
  browserVoicePreference?: string;       // for fallback
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
```

**Playback strategy**:
1. `fetch('/api/tts', { method: 'POST', body, signal })` with `AbortController` for cancellation.
2. Read response as a `Blob` (simpler than streaming PCM chunks, and ElevenLabs returns streamable MP3).
3. Create `URL.createObjectURL(blob)` → play via `HTMLAudioElement`.
4. Revoke the object URL on playback end to prevent memory leaks.

**Why Blob over streaming Web Audio**: ElevenLabs Turbo v2.5 generates the full response in ~300-800ms for typical mentor responses (50-200 words). The latency benefit of streaming PCM chunk-by-chunk is minimal compared to the complexity it adds. The blob approach is simpler, more compatible (no AudioContext), and the perceived latency is still under 1 second.

**Fallback**: If `/api/tts` returns 503 (not configured) or network error, fall back to the existing `useSpeechSynthesis` hook's `speakMessage()` function using the archetype's `preferredVoices[0]`. Fallback is silent — no user notification. The UI shows the same speak button regardless of which engine provides audio.

**Lifecycle and cleanup**:
- `speak()` always calls `stop()` first, cancelling any in-flight fetch (via `abortController.abort()`) and stopping any playing audio before starting new speech. This prevents overlapping audio when the user sends rapid messages.
- `stop()` must: (1) abort the fetch `AbortController`, (2) pause and remove the `HTMLAudioElement`, (3) call `URL.revokeObjectURL()` on any active blob URL, (4) reset `isSpeaking` and `isLoading` state.
- The hook's `useEffect` cleanup calls `stop()` on component unmount (e.g., navigating away from the chat page).

**Error handling**: If TTS fails (network error, 429 rate limit, 500 server error), the hook sets `error` but does NOT show a toast or error UI. It silently falls back to browser TTS if `fallbackToBrowser` is true (default). If browser TTS also fails, the message simply remains text-only.

### 3.4 Environment Configuration

Add to `.env.local`:
```
ELEVENLABS_API_KEY=sk_...
```

Add to `.env.example` / documentation:
```
# Optional: ElevenLabs API key for AI voice synthesis
# Without this, mentors fall back to browser speech synthesis
ELEVENLABS_API_KEY=
```

---

## 3A. MentorType ↔ MentorArchetype Mapping

### The Problem

The codebase has two parallel type systems for mentors:

| System | Type | Values | Used By |
|--------|------|--------|---------|
| `packages/core/src/enums.ts` | `MentorType` | `stoic`, `coach`, `scientist` | `PERSONA_CONFIGS`, `buildSystemPrompt()`, `sendMessage()` action, Supabase `user_mentors` table |
| `apps/web/src/lib/mentor-archetypes.ts` | `MentorArchetype` | `therapist`, `coach`, `sage` | `ArchetypeConfig`, voice system, UI components |

Note: `coach` overlaps, but `stoic` ≠ `therapist` and `scientist` ≠ `sage`.

### The Solution

Add a bidirectional mapping utility in `apps/web/src/lib/mentor-archetypes.ts`:

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

### Chat Page Data Plumbing (fixes hardcoded 'stoic')

The chat page at `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/page.tsx` must:

1. Query the `user_mentors` table to retrieve the mentor record (which includes the `MentorType` stored as `mentor_type`)
2. Map `MentorType` → `MentorArchetype` using `mentorTypeToArchetype()`
3. Pass `archetype` as a prop to `ChatClient`

Updated `ChatClientProps`:
```typescript
interface ChatClientProps {
  userMentorId: string;
  initialMessages: Array<{ role: string; content: string }>;
  mentorName?: string;
  archetype: MentorArchetype;  // NEW — resolved by server component
}
```

**New function in `apps/web/src/lib/services/mentor-service.ts`**:

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

This returns a record like `{ id, user_id, mentor_id, is_active, mentor: { mentor_type: 'stoic' } }`.

Updated `page.tsx`:
```typescript
import { MentorType } from '@life-design/core';
import { mentorTypeToArchetype, getArchetypeConfig } from '@/lib/mentor-archetypes';
import { getChatHistory, getUserMentorById } from '@/lib/services/mentor-service';

export default async function ChatPage({ params }: ChatPageProps) {
  const { userMentorId } = await params;
  const [{ data: messages }, { data: userMentor }] = await Promise.all([
    getChatHistory(userMentorId, 100),
    getUserMentorById(userMentorId),
  ]);

  const mentorType = userMentor?.mentor?.mentor_type as MentorType;
  const archetype = mentorTypeToArchetype(mentorType);
  const config = getArchetypeConfig(archetype);

  return (
    <ChatClient
      userMentorId={userMentorId}
      initialMessages={...}
      mentorName={config.characterName}
      archetype={archetype}
    />
  );
}
```

This also fixes the hardcoded `'stoic'` on line 116 of `chat-client.tsx` — the `sendMessage` call should use `archetypeToMentorType(archetype)` instead.

---

## 4. Mentor Avatar Component

### 4.1 Component Interface

**File**: `apps/web/src/components/mentors/mentor-avatar.tsx`

```typescript
import type { MentorArchetype } from '@/lib/mentor-archetypes';
import type { PersonaBlend } from '@/lib/mentor-types';

interface MentorAvatarProps {
  archetype: MentorArchetype;
  state: 'idle' | 'thinking' | 'speaking';
  size: 'sm' | 'md' | 'lg';           // 32px, 48px, 96px
  blend?: PersonaBlend;                // optional for blended ring color
  className?: string;
}
```

> **Type consolidation**: The `PersonaBlend` interface is currently duplicated in `chat-bubble.tsx` and `persona-display.tsx` with identical shapes. As part of this work, extract it to a shared file `apps/web/src/lib/mentor-types.ts` and update all imports. This file also exports `getDominantArchetype()` (see Section 9).

### 4.2 Visual States

**Idle**: Static portrait image with a subtle 1px accent-color border ring.

**Thinking** (replaces current `TypingIndicator` orb): Portrait with a slow breathing pulse animation on the border ring. CSS:
```css
@keyframes mentorBreathing {
  0%, 100% { box-shadow: 0 0 0 2px var(--accent-muted); }
  50%      { box-shadow: 0 0 0 4px var(--accent-muted), 0 0 12px var(--accent-muted); }
}
```

**Speaking**: Portrait with an animated waveform ring. Uses a conic-gradient that rotates, combined with the existing `WaveformBars` component rendered in a small strip below the avatar. CSS:
```css
@keyframes mentorSpeaking {
  from { --ring-rotation: 0deg; }
  to   { --ring-rotation: 360deg; }
}
```

### 4.3 Image Loading

Use Next.js `<Image>` component with `priority` for the `md` size (chat avatar), `lazy` for `sm` and `lg`. Fallback to the persona gradient orb if the image fails to load (preserves current behavior as the degraded state).

---

## 5. Chat UI Changes

### 5.1 ChatBubble Modifications

**File**: `apps/web/src/components/mentors/chat-bubble.tsx`

Changes:
1. **Avatar**: Replace lines 176-184 (the gradient "M" div) with `<MentorAvatar archetype={archetype} state="idle" size="sm" />`. Requires adding `archetype` to `ChatBubbleProps`.
2. **Speak button**: Add a small speaker icon button to each assistant message. Clicking it calls `speak(content, archetype)` from the TTS hook.
3. **Speaking state**: When the TTS hook reports `isSpeaking` for a given message, the `MentorAvatar` switches to `state="speaking"` and the `WaveformBars` next to the avatar activate.

New prop additions to `ChatBubbleProps`:
```typescript
export interface ChatBubbleProps {
  // ... existing props ...
  archetype?: MentorArchetype;         // NEW
  onSpeak?: (text: string) => void;    // NEW: trigger TTS
  speakingMessageId?: string;          // NEW: which message is currently being spoken
  messageId?: string;                  // NEW: to match against speakingMessageId
}
```

### 5.2 Chat Header

**File**: `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/chat-client.tsx`

Replace the current header (lines 226-248) with:
- `<MentorAvatar archetype={archetype} state={isSpeaking ? 'speaking' : 'idle'} size="md" />`
- Character name (e.g., "Eleanor") instead of generic "Your Mentor"
- Subtitle: archetype label (e.g., "Compassionate Therapist")
- Speaking indicator: "Speaking..." text when `isSpeaking` is true

### 5.3 Auto-Speak Logic

In `chat-client.tsx`, add auto-speak behavior:

```typescript
const shouldAutoSpeak = (lastUserMessageType: MessageType, voiceSettingsEnabled: boolean) => {
  // Auto-speak when:
  // 1. User sent a voice message (reciprocal conversation)
  // 2. User has "always speak" enabled in settings
  return lastUserMessageType === 'voice' || voiceSettingsEnabled;
};
```

When `shouldAutoSpeak` returns true, after receiving the assistant's text response, automatically call `speak(responseText, archetype)`. Since `speak()` always cancels previous speech before starting (see Section 3.3 lifecycle), rapid messages naturally debounce — only the latest response is spoken.

### 5.4 TypingIndicator Update

Replace the "M" orb in `TypingIndicator` with `<MentorAvatar archetype={archetype} state="thinking" size="sm" />`. Add `archetype` prop to `TypingIndicator`.

---

## 6. Mentor Card Redesign

**File**: `apps/web/src/components/mentors/mentor-card.tsx`

Current card is a bare div with name + description + activate button. Redesign:

```
┌──────────────────────────────────┐
│  ┌────────┐                      │
│  │ Portrait│  Eleanor             │
│  │  96×96  │  Compassionate       │
│  │         │  Therapist           │
│  └────────┘                      │
│                                  │
│  "Gentle, emotionally validating │
│   guidance with reflective       │
│   questions."                    │
│                                  │
│  [ 🔊 Hear Voice ]  [ Chat → ]  │
│                                  │
│  ── Active ──────────────────── │
└──────────────────────────────────┘
```

The "Hear Voice" button plays the archetype's `greetingText` through ElevenLabs (or browser TTS fallback).

---

## 7. Voice Settings Panel

**File**: `apps/web/src/components/settings/VoiceSettingsPanel.tsx`

New section in the Settings page, added to `settings-client.tsx`:

### Controls:
- **"Speak mentor responses aloud"** — toggle, default off. Stored in localStorage key `ld:voice-enabled`.
- **"Auto-speak in voice conversations"** — toggle, default on. When a user sends a voice message, the response is automatically spoken. Stored in `ld:voice-auto-speak`.
- **Voice speed** — range slider, 0.75x to 1.25x, default 1.0. Stored in `ld:voice-speed`. Maps to the `speed` parameter sent to `/api/tts`.
- **Per-mentor voice preview** — three cards (Eleanor, Theo, Maya) each with a "Preview" button that plays the greeting text.

### Data Usage Note:
Display: "Voice responses use approximately 50-100KB per message via ElevenLabs."

### Design Note — Settings Page Color Scheme:
The existing settings page uses a warm/earthy color scheme (`#2A2623` backgrounds, `#A8A198` text, `#5A7F5A` accents, `#E8E4DD` borders). The `VoiceSettingsPanel` MUST match this aesthetic — not the dark glass-morphism theme from the chat components. Use the existing settings page patterns: `bg-[#F5F3EF]` cards, `text-[#2A2623]` headings, `border-[#E8E4DD]` dividers.

---

## 8. Alignment of Voice IDs

The existing `config/assets.ts` has `voiceSamples` with IDs `sage`, `coach`, `zen`, `scholar`. These don't align with the archetype keys (`therapist`, `coach`, `sage`).

**Resolution**: The `voiceSamples` array in `config/assets.ts` is for pre-recorded CDN audio used in the cinematic experience — it is NOT part of the mentor chat voice system. No changes needed to `voiceSamples`. The ElevenLabs voice system operates independently via the `/api/tts` route and `useElevenLabsTTS` hook.

The existing `useSpeechSynthesis` hook and `VoiceSelector` component continue to serve as the fallback layer. Their voice IDs (`calm-british-female`, `warm-american-male`, `soft-australian-female`) already map to Eleanor, Theo, and Maya respectively via the existing `preferredVoices` field in `ArchetypeConfig`.

---

## 9. Persona Blend and Voice

When the mentor has a persona blend (e.g., 45% coach, 35% therapist, 20% sage), the **dominant archetype** determines the voice used. The voice does not blend — only one ElevenLabs voice speaks at a time.

The dominant archetype is derived from:
```typescript
function getDominantArchetype(blend: PersonaBlend): MentorArchetype {
  const entries = Object.entries(blend) as [MentorArchetype, number][];
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}
```

This function already exists in spirit in `PersonaDisplay` (`derivePersonaTitle`) and `ChatBubble` (`personaLabel`). Extract it to `apps/web/src/lib/mentor-types.ts` (NOT `packages/core`, since `MentorArchetype` is a web-app-level type). Update `PersonaDisplay` and `ChatBubble` to import from `mentor-types.ts` instead of duplicating the logic.

---

## 10. Meditation & Ritual Voice

The existing `morning-ritual.tsx` and `evening-ritual.tsx` components generate meditation scripts via the `buildGuidedMeditationPrompt` function. These are natural candidates for voice output.

**Integration**: After the meditation script is generated by Gemini, automatically pass it through `/api/tts` using the user's active mentor archetype. The meditation experience becomes an audio-guided session where the character "reads" the meditation aloud.

This is a natural extension but **deferred to a follow-up iteration** to keep the initial scope focused on the chat voice experience.

---

## 11. File Manifest

### New Files (6 code + 9 assets)

| File | Purpose |
|------|---------|
| `apps/web/src/app/api/tts/route.ts` | ElevenLabs streaming TTS proxy with auth, rate limiting, input validation |
| `apps/web/src/hooks/useElevenLabsTTS.ts` | Client-side TTS hook with blob playback, browser fallback, lifecycle cleanup |
| `apps/web/src/lib/mentor-types.ts` | Shared `PersonaBlend` type + `getDominantArchetype()` utility (consolidates duplicates from chat-bubble.tsx and persona-display.tsx) |
| `apps/web/src/components/mentors/mentor-avatar.tsx` | Character portrait component with idle/thinking/speaking states |
| `apps/web/src/components/settings/VoiceSettingsPanel.tsx` | Voice preference controls for Settings page (earthy color scheme) |
| `apps/web/src/lib/mentor-types.test.ts` | Unit tests for mentor type mapping and getDominantArchetype |
| Supabase migration | `CREATE TABLE tts_rate_limits` (see Section 3.5) |
| `public/images/mentors/therapist/portrait-96.webp` | Eleanor portrait 96px |
| `public/images/mentors/therapist/portrait-48.webp` | Eleanor portrait 48px |
| `public/images/mentors/therapist/portrait-32.webp` | Eleanor portrait 32px |
| `public/images/mentors/coach/portrait-96.webp` | Theo portrait 96px |
| `public/images/mentors/coach/portrait-48.webp` | Theo portrait 48px |
| `public/images/mentors/coach/portrait-32.webp` | Theo portrait 32px |
| `public/images/mentors/sage/portrait-96.webp` | Maya portrait 96px |
| `public/images/mentors/sage/portrait-48.webp` | Maya portrait 48px |
| `public/images/mentors/sage/portrait-32.webp` | Maya portrait 32px |

### Modified Files (10)

| File | Changes |
|------|---------|
| `apps/web/src/lib/mentor-archetypes.ts` | Add `portraitBasePath`, `accentColor`, `elevenLabsVoiceId`, `voiceSettings`, `greetingText` to `ArchetypeConfig`. Add `mentorTypeToArchetype()` and `archetypeToMentorType()` mapping functions. |
| `apps/web/src/components/mentors/chat-bubble.tsx` | Replace "M" orb with `MentorAvatar`, add `archetype`/`onSpeak`/`speakingMessageId` props, add speak button. Import `PersonaBlend` from `@/lib/mentor-types` instead of local definition. |
| `apps/web/src/components/mentors/persona-display.tsx` | Import `PersonaBlend` from `@/lib/mentor-types` instead of local definition. |
| `apps/web/src/components/mentors/mentor-card.tsx` | Add portrait image, voice preview button, visual redesign |
| `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/page.tsx` | Query mentor record to resolve `MentorType` → `MentorArchetype`, pass `archetype` and `mentorName` to `ChatClient` |
| `apps/web/src/app/(protected)/mentors/[userMentorId]/chat/chat-client.tsx` | Accept `archetype` prop. Wire `useElevenLabsTTS`, auto-speak logic, pass archetype to bubbles. Fix hardcoded `'stoic'` → use `archetypeToMentorType(archetype)`. Updated header with character name and avatar. |
| `apps/web/src/app/(protected)/settings/settings-client.tsx` | Add "Voice & Personality" section with `VoiceSettingsPanel` |
| `apps/web/src/lib/services/mentor-service.ts` | Add `getUserMentorById()` function to query single user_mentor with joined mentor_type |
| `apps/web/src/config/assets.ts` | Add code comment clarifying `voiceSamples` is for cinematic experience only, unrelated to ElevenLabs mentor voice system |
| `.env.local` / `.env.example` | Add `ELEVENLABS_API_KEY` |

---

## 12. Privacy & Cost Considerations

### Privacy
- Mentor response text is sent to ElevenLabs for voice synthesis. This text is AI-generated (not user-written journal content). User input is NOT sent to ElevenLabs.
- ElevenLabs API key is server-side only; the client cannot extract it.
- Voice settings are stored in localStorage (no server persistence needed).
- Users must explicitly enable voice output; it is off by default.

### Cost
- ElevenLabs pricing: ~$0.30 per 1,000 characters (Turbo v2.5).
- Average mentor response: ~500 characters → ~$0.15 per voiced response.
- Rate limit of 60 requests/hour/user prevents runaway costs.
- Fallback to free browser TTS when API key is not configured or quota is exhausted.

### Accessibility
- Voice output is supplementary; all content remains available as text.
- Speaking state is announced via `aria-live` regions.
- Voice speed control allows users to adjust playback rate.
- Stop button is always visible when speech is active.

---

## 13. Open Questions

1. **ElevenLabs voice selection**: Specific voice IDs will be chosen during implementation by auditioning voices from the ElevenLabs library. Criteria: must match the gender, accent, and warmth described in the character profiles.
2. **Character portrait art**: Illustrations need to be commissioned or generated. Style reference: warm, semi-abstract, consistent across all three. Could use AI generation (Midjourney/DALL-E) as initial placeholders, then commission final art.
3. **WebSocket vs HTTP streaming**: This spec uses HTTP streaming (chunked transfer encoding) for simplicity. ElevenLabs also offers a WebSocket API for lower latency. If first-byte latency proves to be a UX issue, the `/api/tts` route can be upgraded to a WebSocket endpoint in a follow-up iteration.
