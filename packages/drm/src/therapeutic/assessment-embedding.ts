/**
 * @module therapeutic/assessment-embedding
 *
 * Natural, conversational embedding of validated clinical assessments
 * (PHQ-9, GAD-7) into therapeutic dialogue.
 *
 * The instruments are administered across multiple conversations through
 * natural phrasings rather than verbatim clinical language, reducing the
 * clinical feel and improving honest responding.
 */

import { NaturalAssessmentItem, AssessmentSession } from '../types.js';

// ── PHQ-9 Items ───────────────────────────────────────────────────────────────

/**
 * All 9 PHQ-9 items with 3 natural conversational phrasings each.
 * Items are indexed 0–8, matching PHQ-9 question order.
 *
 * Standard scoring: 0 = Not at all, 1 = Several days,
 * 2 = More than half the days, 3 = Nearly every day.
 */
export const PHQ9_NATURAL_ITEMS: NaturalAssessmentItem[] = [
  {
    instrument: 'PHQ-9',
    itemIndex: 0,
    originalText: 'Little interest or pleasure in doing things',
    naturalPhrasings: [
      'Have you been finding it hard to enjoy things you normally would — like hobbies, time with people, or even small pleasures?',
      'Have things you usually enjoy been feeling a bit flat or uninteresting lately?',
      'How much have you been able to get pleasure from day-to-day things over the past couple of weeks?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 1,
    originalText: 'Feeling down, depressed, or hopeless',
    naturalPhrasings: [
      'How often have you been feeling low, down, or like things won\'t get better?',
      'Have you been experiencing a kind of heaviness or sadness that\'s been hard to shake?',
      'How much has your mood been pulling you down recently — feeling hopeless or depressed?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 2,
    originalText: 'Trouble falling or staying asleep, or sleeping too much',
    naturalPhrasings: [
      'How has your sleep been going? Are you getting too little, too much, or is it broken and restless?',
      'Have you been struggling to get to sleep, waking through the night, or finding yourself sleeping way more than usual?',
      'Has sleep been a problem lately — either not enough, or almost too much of it?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 3,
    originalText: 'Feeling tired or having little energy',
    naturalPhrasings: [
      'How are your energy levels? Have you been feeling worn out or exhausted even without doing much?',
      'Have you noticed a kind of bone-tiredness that makes even small tasks feel like a lot of effort?',
      'How often have you felt fatigued or like you\'re running on empty recently?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 4,
    originalText: 'Poor appetite or overeating',
    naturalPhrasings: [
      'Has your relationship with food shifted at all — eating noticeably more or less than usual?',
      'How has your appetite been? Have you been forgetting to eat, or finding yourself eating much more than normal?',
      'Have you noticed any big changes in how much or how little you feel like eating?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 5,
    originalText: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
    naturalPhrasings: [
      'Have you been having thoughts that you\'re not good enough, or that you\'ve let people down in some way?',
      'How much has your inner critic been active lately — feelings of being a failure or not measuring up?',
      'Have you been feeling negatively about yourself — like you\'ve disappointed others or yourself?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 6,
    originalText: 'Trouble concentrating on things, such as reading the newspaper or watching television',
    naturalPhrasings: [
      'Have you been finding it hard to concentrate — like your mind keeps drifting when you\'re trying to read or watch something?',
      'How\'s your ability to focus been lately? Can you stay with something, or does your attention slip away easily?',
      'Has it been difficult to hold your attention on things — even things that are usually easy to follow?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 7,
    originalText:
      'Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual',
    naturalPhrasings: [
      'Have you noticed feeling unusually slowed down — like moving or thinking through treacle — or the opposite, wired and restless?',
      'Has your body felt sluggish and heavy, or have you been fidgety and unable to sit still?',
      'Have people around you noticed you seeming either very slow or unusually agitated and restless?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'PHQ-9',
    itemIndex: 8,
    originalText:
      'Thoughts that you would be better off dead, or of hurting yourself in some way',
    naturalPhrasings: [
      'I want to ask about something that can sometimes come up when people are really struggling — have you had any thoughts of harming yourself or not wanting to be here?',
      'Sometimes when things are very hard, dark thoughts can surface. Has any part of you been having thoughts about hurting yourself or that things would be easier if you weren\'t around?',
      'Have you had any thoughts, even passing ones, about not wanting to be alive or hurting yourself in some way?',
    ],
    lastAdministered: null,
    score: null,
  },
];

// ── GAD-7 Items ───────────────────────────────────────────────────────────────

/**
 * All 7 GAD-7 items with 3 natural conversational phrasings each.
 * Items are indexed 0–6, matching GAD-7 question order.
 *
 * Standard scoring: 0 = Not at all, 1 = Several days,
 * 2 = More than half the days, 3 = Nearly every day.
 */
export const GAD7_NATURAL_ITEMS: NaturalAssessmentItem[] = [
  {
    instrument: 'GAD-7',
    itemIndex: 0,
    originalText: 'Feeling nervous, anxious, or on edge',
    naturalPhrasings: [
      'How often have you been feeling anxious, nervous, or like you\'re braced for something to go wrong?',
      'Have you been experiencing that edgy, on-alert feeling — like something bad might happen even when nothing obvious is threatening?',
      'How much has anxiety or nervousness been showing up for you recently?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'GAD-7',
    itemIndex: 1,
    originalText: 'Not being able to stop or control worrying',
    naturalPhrasings: [
      'When worry shows up, are you able to set it aside, or does it tend to spiral and take over?',
      'Have you been finding that worrying kind of runs on its own — like it\'s hard to turn off once it starts?',
      'How much control do you feel you have over your worrying? Or does it feel like it just goes wherever it wants?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'GAD-7',
    itemIndex: 2,
    originalText: 'Worrying too much about different things',
    naturalPhrasings: [
      'Has your worry been spreading across lots of different areas — work, relationships, health, money — rather than one specific thing?',
      'Do you find yourself worried about many different things, jumping from one concern to the next?',
      'Has anxiety been attaching itself to lots of different topics in your life lately?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'GAD-7',
    itemIndex: 3,
    originalText: 'Trouble relaxing',
    naturalPhrasings: [
      'When you have downtime, are you actually able to relax and switch off — or does your mind keep running?',
      'Have you found it difficult to genuinely unwind, even when you\'re not doing anything demanding?',
      'How easy has it been to relax recently — does rest come naturally, or does it feel like you can\'t quite get there?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'GAD-7',
    itemIndex: 4,
    originalText: 'Being so restless that it is hard to sit still',
    naturalPhrasings: [
      'Have you been feeling physically restless or jittery — finding it hard to sit comfortably and just be still?',
      'Is your body expressing the anxiety — restlessness, fidgeting, a kind of inner agitation that makes sitting still uncomfortable?',
      'Have you noticed a kind of physical restlessness that makes it hard to settle — even when you want to?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'GAD-7',
    itemIndex: 5,
    originalText: 'Becoming easily annoyed or irritable',
    naturalPhrasings: [
      'Has your fuse been shorter than usual — finding yourself more irritable or snapping more easily?',
      'Have small things been irritating you more than normal, or has your patience been thinner lately?',
      'How has your irritability been? Are you finding yourself getting wound up over things that normally wouldn\'t bother you?',
    ],
    lastAdministered: null,
    score: null,
  },
  {
    instrument: 'GAD-7',
    itemIndex: 6,
    originalText: 'Feeling afraid, as if something awful might happen',
    naturalPhrasings: [
      'Have you been experiencing a sense of dread or fear — like something terrible is just around the corner, even if you can\'t name what?',
      'How often has that feeling of something awful being about to happen been with you lately?',
      'Has there been a kind of background fear or foreboding — a sense that something bad is coming?',
    ],
    lastAdministered: null,
    score: null,
  },
];

// ── Prompt ────────────────────────────────────────────────────────────────────

/**
 * Instructions for Claude on how to naturally weave a clinical assessment
 * question into therapeutic conversation without breaking rapport.
 *
 * This prompt is prepended to individual assessment questions when delivering
 * them within a session context.
 */
export const ASSESSMENT_EMBEDDING_PROMPT = `You are conducting a warm, relational therapeutic conversation. At an appropriate moment in the dialogue, you need to ask the following assessment question. Your goal is to weave it into the conversation naturally — not to administer it in a clinical, checklist-like way.

Guidelines for embedding assessment questions:

1. CONTEXTUAL TIMING: Only ask the question when it fits the natural flow. If the user is currently sharing something emotionally important, let them finish and acknowledge their experience before transitioning.

2. BRIDGE NATURALLY: Use a transitional phrase that connects the question to what the user has already shared. For example: "You mentioned feeling tired lately — I'm curious about that more broadly…" or "That connects to something I'd like to check in on with you…"

3. SCORING ANCHOR: After the user responds, gently anchor to a frequency framing — over the past two weeks, how often: not at all, several days, more than half the days, or nearly every day. Do this conversationally, not as a formal prompt. Example: "When you say you've been feeling that — is that more like a few days here and there, or has it been most days?"

4. VALIDATE BEFORE SCORING: Always acknowledge the user's experience before moving to any scoring. Never make the conversation feel like a survey.

5. SENSITIVE ITEMS: For the PHQ-9 item about self-harm (item 9), approach with particular care and warmth. Frame it as a normal part of checking in when someone is struggling, not as an alarming question. If the user responds positively, follow your safety protocol before continuing the assessment.

6. PHRASING CHOICE: Use the natural phrasing provided for this item — do not revert to clinical language.

The assessment question to embed follows below:`;

// ── Session Management ────────────────────────────────────────────────────────

/**
 * Create a new assessment session for the given user and instrument.
 * Items are deep-copied so mutations do not affect the source constants.
 */
export function createAssessmentSession(
  userId: string,
  instrument: 'PHQ-9' | 'GAD-7',
): AssessmentSession {
  const sourceItems =
    instrument === 'PHQ-9' ? PHQ9_NATURAL_ITEMS : GAD7_NATURAL_ITEMS;

  const items: NaturalAssessmentItem[] = sourceItems.map((item) => ({
    ...item,
    naturalPhrasings: [...item.naturalPhrasings],
    lastAdministered: null,
    score: null,
  }));

  return {
    userId,
    instrument,
    items,
    completedItems: 0,
    totalItems: items.length,
    startedAt: new Date(),
    completedAt: null,
    totalScore: null,
    severity: null,
  };
}

/**
 * Return the next item that has not yet been scored, or null if all items
 * have been administered.
 */
export function getNextAssessmentItem(
  session: AssessmentSession,
): NaturalAssessmentItem | null {
  const next = session.items.find((item) => item.score === null);
  return next ?? null;
}

/**
 * Record a user's response for a specific item index and return an updated
 * session (immutable — the original session is not modified).
 *
 * @param session   - Current assessment session.
 * @param itemIndex - The zero-based index of the item being scored.
 * @param score     - PHQ-9/GAD-7 score: 0 (not at all) to 3 (nearly every day).
 * @returns         - A new AssessmentSession with the response recorded.
 * @throws          - RangeError if itemIndex is out of bounds or score is invalid.
 */
export function recordAssessmentResponse(
  session: AssessmentSession,
  itemIndex: number,
  score: number,
): AssessmentSession {
  if (itemIndex < 0 || itemIndex >= session.items.length) {
    throw new RangeError(
      `itemIndex ${itemIndex} is out of bounds for a ${session.instrument} session (0–${session.items.length - 1})`,
    );
  }
  if (score < 0 || score > 3 || !Number.isInteger(score)) {
    throw new RangeError(`score must be an integer 0–3, received: ${score}`);
  }

  const updatedItems: NaturalAssessmentItem[] = session.items.map((item, idx) => {
    if (idx !== itemIndex) return item;
    return {
      ...item,
      naturalPhrasings: [...item.naturalPhrasings],
      score,
      lastAdministered: new Date(),
    };
  });

  const completedItems = updatedItems.filter((item) => item.score !== null).length;

  return {
    ...session,
    items: updatedItems,
    completedItems,
  };
}

/**
 * Return true when every item in the session has a recorded score.
 */
export function isAssessmentComplete(session: AssessmentSession): boolean {
  return session.items.every((item) => item.score !== null);
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Severity band boundaries keyed by instrument.
 *
 * Each entry is an array of [maxScore, label] pairs ordered from lowest to
 * highest. The first band whose maxScore >= totalScore is the severity label.
 */
const SEVERITY_BANDS: Readonly<Record<'PHQ-9' | 'GAD-7', ReadonlyArray<readonly [number, string]>>> = {
  'PHQ-9': [
    [4, 'minimal'],
    [9, 'mild'],
    [14, 'moderate'],
    [19, 'moderately severe'],
    [27, 'severe'],
  ],
  'GAD-7': [
    [4, 'minimal'],
    [9, 'mild'],
    [14, 'moderate'],
    [21, 'severe'],
  ],
};

/**
 * Calculate the total score and severity label for a completed assessment.
 *
 * @throws - Error if the session is not complete.
 * @throws - Error if the instrument is not PHQ-9 or GAD-7.
 */
export function scoreCompletedAssessment(
  session: AssessmentSession,
): { totalScore: number; severity: string } {
  if (!isAssessmentComplete(session)) {
    throw new Error(
      `Cannot score an incomplete assessment — ${session.completedItems}/${session.totalItems} items answered`,
    );
  }

  const instrument = session.instrument as 'PHQ-9' | 'GAD-7';
  const bands = SEVERITY_BANDS[instrument];

  if (bands === undefined) {
    throw new Error(`Unknown instrument: ${session.instrument}. Expected 'PHQ-9' or 'GAD-7'.`);
  }

  const totalScore = session.items.reduce<number>(
    (sum, item) => sum + (item.score ?? 0),
    0,
  );

  const severityBand = bands.find(([maxScore]) => totalScore <= maxScore);
  const severity = severityBand !== undefined ? severityBand[1] : bands[bands.length - 1]![1];

  return { totalScore, severity };
}
