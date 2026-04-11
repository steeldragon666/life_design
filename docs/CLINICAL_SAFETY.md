# Clinical Safety

Internal developer documentation for the clinical safety features in Life Design. This covers crisis de-escalation, clinical instrument administration, audit logging, and informed consent requirements.

---

## Table of Contents

1. [Crisis De-Escalation Protocol](#crisis-protocol)
2. [Clinical Instruments](#clinical-instruments)
3. [Crisis Resources](#crisis-resources)
4. [Audit Logging](#audit-logging)
5. [Input Clamping](#input-clamping)
6. [Disclaimer and Informed Consent](#disclaimers)

---

<a name="crisis-protocol"></a>
## 1. Crisis De-Escalation Protocol

### Pattern Matching

Crisis detection uses two-tier regex pattern matching against user text input (journal entries, mentor messages). All text is normalised to lowercase before matching. Patterns also carry `/i` flags as defense-in-depth.

**Priority order**: HIGH patterns are checked first. If any HIGH pattern matches, the system immediately returns a high-level crisis result without checking other patterns. MEDIUM patterns are checked only if no HIGH patterns matched. False-positive patterns are checked only if no crisis patterns matched at all.

### HIGH Patterns (Active Ideation / Self-Harm)

These indicate immediate risk. Confidence: 0.95.

| Category | Example patterns |
|----------|-----------------|
| Direct ideation | "kill myself", "end my life", "take my own life" |
| Suicidal language | "suicid*", "want to die", "better off dead", "end it all" |
| Self-harm | "self-harm", "hurting myself", "cutting myself" |
| Method-specific | "hanging myself", "overdos*", "jumping off/from", "drowning myself", "shooting myself" |

### MEDIUM Patterns (Hopelessness / Passive Ideation)

These indicate distress without explicit intent. Confidence: 0.80.

| Category | Example patterns |
|----------|-----------------|
| Hopelessness | "no point in going on/living", "can't go on", "no reason to live", "nothing to live for" |
| Passive ideation | "don't want to be here/exist/wake up", "wish I was dead/gone/never born" |
| Burdensomeness | "I'm a burden", "nobody would care/miss/notice", "everyone would be better off without me" |

### False-Positive Suppression

Only checked when NO crisis patterns matched. These prevent metaphorical language from triggering false alerts:
- "killing it/the game/time"
- "deadline/work is killing"
- "to die for"
- "dying to try/see/know"

**Critical safety principle**: Crisis signals always take priority. If both a crisis pattern and a false-positive pattern match in the same message, the crisis match wins.

### Response Flow

```
detectCrisisIndicators(text)
  → CrisisDetectionResult { matched, level, triggers, confidence }
  → if matched: buildCrisisResponse(level)
    → CrisisResponse { message, resources, level }
    → Log to crisis_events table
    → Display crisis resources to user
    → Block normal response flow
```

**Source**: `packages/core/src/safety/crisis-detection.ts`, `packages/core/src/safety/crisis-response.ts`

---

<a name="clinical-instruments"></a>
## 2. Clinical Instruments

### PHQ-9 (Patient Health Questionnaire-9)

**Reference**: Kroenke, Spitzer, Williams (2001)

- **Items**: 9 questions, each scored 0-3 (Not at all → Nearly every day)
- **Score range**: 0-27
- **Time frame**: "Over the last 2 weeks"

**Severity bands**:

| Score | Severity | Clinical action |
|-------|----------|----------------|
| 0-4 | Minimal | None |
| 5-9 | Mild | Watchful waiting, re-screen |
| 10-14 | Moderate | Treatment plan consideration |
| 15-19 | Moderately severe | Active treatment recommended |
| 20-27 | Severe | Immediate treatment, specialist referral |

**Item 9 (Suicidal Ideation)**: "Thoughts that you would be better off dead, or of hurting yourself in some way"

Any non-zero response to Item 9 triggers:
1. `criticalItem9` flag set to `true` in the scoring result
2. Crisis pathway activation (crisis resources displayed)
3. Crisis event logged to `crisis_events` table with `trigger_type: 'phq9_item9'`

**Scoring function**: `scorePHQ9()` in `packages/core/src/profiling/psychometric-scoring.ts`

### GAD-7 (Generalized Anxiety Disorder-7)

**Reference**: Spitzer, Kroenke, Williams, Lowe (2006)

- **Items**: 7 questions, each scored 0-3 (Not at all → Nearly every day)
- **Score range**: 0-21
- **Time frame**: "Over the last 2 weeks"

**Severity bands**:

| Score | Severity |
|-------|----------|
| 0-4 | Minimal |
| 5-9 | Mild |
| 10-14 | Moderate |
| 15-21 | Severe |

**Scoring function**: `scoreGAD7()` in `packages/core/src/profiling/psychometric-scoring.ts`

### Administration Contexts

Screenings can be administered in three contexts (stored in `clinical_screenings.context`):
- `onboarding`: During initial profile setup
- `routine`: Periodic re-screening (e.g., every 2 weeks)
- `followup`: Triggered by elevated scores or clinical pathway

---

<a name="crisis-resources"></a>
## 3. Crisis Resources

All crisis responses include these resources, displayed in priority order:

| Service | Phone | Description | URL |
|---------|-------|-------------|-----|
| **Lifeline** | 13 11 14 | 24/7 crisis support and suicide prevention | lifeline.org.au |
| **Beyond Blue** | 1300 22 4636 | Anxiety, depression and suicide prevention support | beyondblue.org.au |
| **Emergency Services** | 000 | For immediate danger to life | - |
| **13YARN** | 13 92 76 | Crisis support for Aboriginal and Torres Strait Islander peoples | 13yarn.org.au |

### Response Messages

Tone adapts to crisis level:

- **HIGH**: "I hear you, and I want you to know that what you're feeling matters. You don't have to go through this alone. Please reach out to one of these services -- they're available right now and ready to help."
- **MEDIUM**: "It sounds like you're going through a really difficult time. I want to make sure you have support available. These services are here for you whenever you need them."
- **LOW**: "It sounds like things are tough right now. If you ever need someone to talk to, these services are available."

**Source**: `packages/core/src/safety/crisis-response.ts`

---

<a name="audit-logging"></a>
## 4. Audit Logging

### crisis_events Table

Every crisis pathway activation is logged to the `crisis_events` table (migration `00029`).

**What is logged**:
- `trigger_type`: What activated the crisis pathway ('phq9_item9', 'mentor_keyword', 'manual')
- `trigger_detail` (JSONB): The specific patterns that matched, confidence level
- `response_shown` (JSONB): Exactly which crisis resources were displayed to the user
- `acknowledged_at`: When (if) the user acknowledged the crisis resources

**Access control**:
- Users can read their own crisis events (SELECT)
- Only service_role can insert crisis events (INSERT) — ensures client-side code cannot tamper with or suppress audit records

### clinical_screenings Table

All instrument administrations are logged to `clinical_screenings` (migration `00029`).

**What is logged**:
- `instrument`: Which instrument was administered ('phq9', 'gad7')
- `responses` (JSONB): Raw item-level responses
- `total_score`: Computed total score
- `severity`: Severity classification
- `critical_flags` (JSONB): Any critical flags (e.g., PHQ-9 item 9)
- `context`: Administration context ('onboarding', 'routine', 'followup')

### export_audit_log Table

Clinical data exports are audited in `export_audit_log` (migration `00039`).

**What is logged**:
- `export_type`: Format ('clinical_pdf', 'clinical_json', 'clinical_csv')
- `data_included`: Which data types were included in the export
- `share_token`: Unique token for shareable links (with expiry)

---

<a name="input-clamping"></a>
## 5. Input Clamping

Clinical instrument scoring functions apply input clamping to prevent out-of-range values from corrupting scores.

**PHQ-9 and GAD-7**: Both use `clamp(v) = Math.max(0, Math.min(3, v))` on every item response before summing. This ensures:
- Negative values are treated as 0
- Values above 3 are treated as 3
- The total score can never exceed the instrument's defined maximum (27 for PHQ-9, 21 for GAD-7)

**Why clamp instead of reject?** Clinical instruments should be robust against data entry errors. Clamping is the standard approach in validated instrument scoring — it prevents a single corrupted value from producing an impossible total while preserving the signal from valid responses.

---

<a name="disclaimers"></a>
## 6. Disclaimer and Informed Consent

### Required Disclaimers

The application must display the following disclaimers at appropriate points:

1. **Not a diagnostic tool**: Life Design is a self-tracking and personal analytics tool. Clinical screening instruments (PHQ-9, GAD-7) are included for self-awareness, not diagnosis. Only a qualified healthcare professional can provide a clinical diagnosis.

2. **Not a substitute for professional help**: AI mentors, insights, and nudges are for informational and reflective purposes only. They do not constitute medical advice, therapy, or crisis intervention.

3. **Crisis resources are informational**: While the app surfaces crisis resources when distress signals are detected, it is not a crisis service and cannot provide real-time intervention.

### Informed Consent Points

Users must be informed before:
- **Clinical screening administration**: "This is a validated screening questionnaire. Your responses are stored securely and can be exported for your healthcare provider."
- **Opt-in tier escalation**: Each tier clearly describes what data is shared and what features are unlocked. See `TIER_BENEFITS` in `packages/core/src/privacy/opt-in-tiers.ts`.
- **Federated learning participation**: Users must understand that model gradients (not raw data) are shared with the coordination server. Requires `Full` opt-in tier.
- **Clinical data export**: Users must explicitly request exports and understand the shareable link mechanism.

### Data Sensitivity Classification

| Data Type | Sensitivity | Consent Level |
|-----------|-------------|---------------|
| Mood check-ins | Standard | Basic tier |
| Journal entries | Standard | Basic tier |
| Health sensor data (HRV, sleep) | Sensitive | Enhanced tier |
| Clinical screening responses | Clinical | Explicit per-screening |
| Crisis events | Clinical | Automatic (safety override) |
| Financial transaction patterns | Sensitive | Full tier |
| Federated model gradients | Derived | Full tier |
