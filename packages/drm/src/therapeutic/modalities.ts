/**
 * @module therapeutic/modalities
 *
 * Complete library of therapeutic techniques across all 7 DRM modalities.
 * Each technique includes delivery guidance for the AI companion.
 */

import { TherapeuticModality } from '../types.js';

export interface TherapeuticTechnique {
  id: string;
  name: string;
  modality: TherapeuticModality;
  description: string;
  duration: string;
  targetStates: string[];        // moods/states this technique helps with
  contraindications: string[];   // conditions where this technique should NOT be used
  promptGuidance: string;        // instructions for Claude on how to deliver this technique
}

// ── CBT Techniques ────────────────────────────────────────────────────────────

const CBT_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'cbt_thought_record',
    name: 'Thought Record',
    modality: TherapeuticModality.CBT,
    description:
      'A structured worksheet that helps identify automatic negative thoughts, examine the evidence for and against them, and develop a balanced alternative perspective.',
    duration: '10–15 minutes',
    targetStates: ['anxious', 'depressed', 'self-critical', 'overwhelmed', 'hopeless'],
    contraindications: [
      'acute dissociative episode',
      'severe psychosis',
      'crisis state requiring immediate safety intervention',
    ],
    promptGuidance:
      'Walk the user through five steps, one at a time, waiting for their response before moving on. Step 1: Situation — ask them to describe what happened briefly. Step 2: Automatic thought — "What went through your mind in that moment?" Step 3: Emotion — name the feeling and rate its intensity 0–100. Step 4: Evidence — explore evidence for AND against the thought, gently balancing both sides. Step 5: Balanced thought — co-create a more balanced statement that is honest, not falsely positive. Always validate the emotion before examining the thought. Do not rush to step 4 until steps 1–3 feel settled.',
  },
  {
    id: 'cbt_cognitive_restructuring',
    name: 'Cognitive Restructuring',
    modality: TherapeuticModality.CBT,
    description:
      'Identify cognitive distortions (e.g., catastrophising, black-and-white thinking, mind reading) in the user\'s narrative and collaboratively reframe them toward more flexible thinking.',
    duration: '10–20 minutes',
    targetStates: ['anxious', 'self-critical', 'angry', 'pessimistic', 'stuck'],
    contraindications: [
      'user has explicitly rejected a cognitive approach in the past',
      'active grief — prioritise validation over reframing',
    ],
    promptGuidance:
      'First listen fully to the user\'s concern. Reflect it back to confirm understanding. Then, if you notice a distortion pattern, name it lightly and non-judgmentally — e.g., "It sounds like part of you might be expecting the worst — that\'s sometimes called catastrophising, and it\'s really common." Ask permission before exploring it further: "Would you be open to looking at that thought together?" If yes, use Socratic questioning — "What\'s the evidence that the worst will happen? Have you faced similar situations before? What actually happened?" Guide toward a realistic alternative, not a falsely positive one.',
  },
  {
    id: 'cbt_behavioural_experiment',
    name: 'Behavioural Experiment',
    modality: TherapeuticModality.CBT,
    description:
      'Design a real-world test of a negative belief. The user predicts what will happen, carries out the experiment, and compares the actual outcome to their prediction.',
    duration: '15–20 minutes to design; experiment carried out between sessions',
    targetStates: ['avoidant', 'anxious', 'low confidence', 'socially withdrawn'],
    contraindications: [
      'user is in a high-distress crisis state',
      'the belief being tested relates to immediate safety',
      'severe agoraphobia without professional support',
    ],
    promptGuidance:
      'Help the user identify one specific belief they hold that is keeping them stuck — e.g., "If I speak up in a meeting, everyone will think I\'m stupid." Collaboratively design a small, achievable experiment to test it. Clarify: What exactly will they do? When? What outcome are they predicting? After the experiment (next check-in), review what actually happened versus what they predicted. Celebrate any disconfirmation warmly. If the experiment confirmed the fear, explore what contributed and whether it was an exception or the rule.',
  },
  {
    id: 'cbt_activity_monitoring',
    name: 'Activity Monitoring',
    modality: TherapeuticModality.CBT,
    description:
      'Track daily activities alongside mood ratings to identify connections between behaviour and emotional state — revealing patterns of avoidance, low engagement, or activities that genuinely lift mood.',
    duration: '5 minutes per day for one week',
    targetStates: ['depressed', 'low motivation', 'anhedonic', 'fatigued'],
    contraindications: [
      'user feels monitoring would increase rumination or self-criticism',
      'obsessive-compulsive traits where tracking could become a compulsion',
    ],
    promptGuidance:
      'Introduce this as an experiment in noticing, not judging. Ask the user to record 3–5 activities each day and rate their mood before and after on a 0–10 scale. Check in after a few days: "What patterns are you noticing? Are there any surprises?" Help them identify activities that reliably lift mood (even slightly) and activities that drain them. Use this data to collaboratively build a more intentional activity schedule.',
  },
];

// ── DBT Techniques ────────────────────────────────────────────────────────────

const DBT_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'dbt_tipp',
    name: 'Distress Tolerance — TIPP',
    modality: TherapeuticModality.DBT,
    description:
      'A rapid biological intervention for overwhelming emotions: Temperature, Intense exercise, Paced breathing, and Progressive muscle relaxation. Targets the body\'s physiology to reduce emotional intensity quickly.',
    duration: '5–20 minutes',
    targetStates: [
      'overwhelmed',
      'dissociating',
      'emotionally flooded',
      'panic',
      'urge to self-harm',
    ],
    contraindications: [
      'cold water on face contraindicated for certain cardiac conditions',
      'intense exercise contraindicated for physical injury or severe illness',
    ],
    promptGuidance:
      'When the user is highly distressed, offer TIPP as a fast-acting body-first tool — not a talking tool. Walk through each letter: T — suggest splashing cold water on their face or holding an ice cube (stimulates the dive reflex, slowing heart rate rapidly). I — suggest 20 seconds of intense exercise such as jumping jacks or running in place. P — guide paced breathing: breathe in for 4 counts, out for 6–8 (longer exhale activates the parasympathetic system). PR — guide progressive muscle relaxation from feet to face, tense each group for 5 seconds then release. Ask which feels most accessible right now and start there.',
  },
  {
    id: 'dbt_emotion_regulation_worksheet',
    name: 'Emotion Regulation Worksheet',
    modality: TherapeuticModality.DBT,
    description:
      'A structured process for understanding an emotion — naming it, identifying its prompt, examining its function, and distinguishing primary from secondary emotions — to reduce reactivity and increase emotional literacy.',
    duration: '10–15 minutes',
    targetStates: ['confused about feelings', 'emotionally reactive', 'ashamed', 'angry'],
    contraindications: [
      'acute crisis — stabilise first',
      'user is too distressed to reflect; use distress tolerance first',
    ],
    promptGuidance:
      'Ask the user to name the emotion as specifically as possible — not just "bad" but "ashamed", "furious", or "grief-stricken". Then explore: What prompted it (the situation)? What are the body sensations? What action urge is the emotion pulling toward? Is this the primary emotion or a secondary one covering something underneath? Finally, ask: "Does this emotion fit the facts? Is it telling you something important?" Avoid leading them to dismiss the emotion — validate its function even while exploring whether it is serving them.',
  },
  {
    id: 'dbt_dear_man',
    name: 'Interpersonal Effectiveness — DEAR MAN',
    modality: TherapeuticModality.DBT,
    description:
      'A structured framework for asking for what you need or saying no effectively while preserving the relationship and self-respect. DEAR MAN: Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate.',
    duration: '15–25 minutes',
    targetStates: ['conflict-avoidant', 'people-pleasing', 'resentful', 'assertiveness difficulties'],
    contraindications: [
      'not appropriate if the relationship involves abuse or safety risk',
      'use only when the user genuinely wants to make a request, not as a script for manipulation',
    ],
    promptGuidance:
      'Help the user prepare for a specific conversation they are dreading or avoiding. Work through each letter together: D — describe the situation factually, without judgment. E — express how you feel about it using "I" statements. A — assert what you want or don\'t want, clearly and directly. R — reinforce — explain the benefit for the other person if they agree. M — stay mindful of your goal; don\'t get derailed by defensiveness. A — appear confident even if you don\'t feel it. N — be willing to negotiate. Role-play the conversation if the user is willing, and debrief what feels hard.',
  },
  {
    id: 'dbt_wise_mind',
    name: 'Wise Mind Meditation',
    modality: TherapeuticModality.DBT,
    description:
      'A mindfulness practice to access the integrated state between Emotion Mind (driven purely by feelings) and Reasonable Mind (driven purely by logic) — the Wise Mind that holds both.',
    duration: '5–10 minutes',
    targetStates: ['conflicted', 'indecisive', 'emotionally reactive', 'disconnected from self'],
    contraindications: [
      'severe depersonalisation — grounding exercises may be more appropriate first',
    ],
    promptGuidance:
      'Guide the user to sit comfortably and take a few slow breaths. Describe Emotion Mind and Reasonable Mind briefly. Then invite them to imagine descending to a still, quiet centre — their Wise Mind. Suggest they hold their question or dilemma there and simply notice what arises, without forcing. Ask: "What does your Wise Mind say about this?" Do not interpret for them. After the exercise, explore what they noticed. Wise Mind answers are often quiet, simple, and felt in the body rather than the head.',
  },
];

// ── ACT Techniques ────────────────────────────────────────────────────────────

const ACT_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'act_values_clarification',
    name: 'Values Clarification',
    modality: TherapeuticModality.ACT,
    description:
      'Help the user identify their deeply held personal values — what matters most to them — to reconnect with intrinsic motivation and guide committed action, especially when life feels purposeless.',
    duration: '15–25 minutes',
    targetStates: ['purposeless', 'depressed', 'stuck', 'drifting', 'post-loss of identity'],
    contraindications: [
      'not appropriate as a crisis intervention',
      'avoid if the user is currently being coerced — their values may be suppressed by external pressure',
    ],
    promptGuidance:
      'Ask the user to imagine attending their own 80th birthday party. "What do you hope the people who love you would say about the kind of person you were?" Or: "When have you felt most alive and most yourself?" Use their answers to draw out 3–5 core values — e.g., connection, creativity, honesty, courage. Distinguish values from goals: a value is a direction (being a loving parent), not a destination (getting a promotion). Then ask: "On a scale of 0–10, how much are you living in alignment with each value right now?" Explore the gaps with curiosity, not judgment.',
  },
  {
    id: 'act_cognitive_defusion',
    name: 'Cognitive Defusion — Leaves on a Stream',
    modality: TherapeuticModality.ACT,
    description:
      'A visualisation technique to create psychological distance from intrusive or distressing thoughts — placing them on leaves floating down a stream rather than being caught inside them.',
    duration: '5–10 minutes',
    targetStates: ['ruminating', 'intrusive thoughts', 'fused with negative beliefs', 'anxious'],
    contraindications: [
      'may be disorienting for users who are already dissociating',
      'not suitable for users with strong resistance to visualisation or mindfulness',
    ],
    promptGuidance:
      'Guide the user through a short visualisation. Ask them to close their eyes and imagine sitting beside a gently flowing stream in autumn. Leaves are drifting by on the surface. Invite them to place each thought — whatever arises — on a leaf and watch it float downstream. No need to engage with or solve the thought; just notice it and let it pass. If a thought is particularly sticky, that\'s fine — name that stickiness as information. After 5 minutes, bring them back and ask: "What did you notice? Were any leaves harder to let go?" Use this to explore fused beliefs.',
  },
  {
    id: 'act_willingness_acceptance',
    name: 'Willingness and Acceptance',
    modality: TherapeuticModality.ACT,
    description:
      'An experiential exercise to shift from struggling against difficult emotions to opening up to them — reducing the secondary suffering caused by fighting internal experience.',
    duration: '10–15 minutes',
    targetStates: ['resistant to feelings', 'avoidant', 'controlling', 'emotionally exhausted from suppression'],
    contraindications: [
      'do not use with trauma flashbacks without trauma-specific protocol',
      'not appropriate if the user is currently in acute distress requiring stabilisation',
    ],
    promptGuidance:
      'Introduce the "quicksand" metaphor: the more you struggle against quicksand, the faster you sink. Fighting emotions works the same way. Invite the user to name what they\'ve been trying not to feel. Then gently guide them to simply notice it — where is it in the body? What does it feel like? What shape, colour, or texture might it have? Encourage them to let it be there without pushing it away or inviting it to stay. Ask: "Can you make a little room for this feeling, just for now?" Close by reflecting on what they notice when they stop fighting.',
  },
  {
    id: 'act_committed_action',
    name: 'Committed Action Planning',
    modality: TherapeuticModality.ACT,
    description:
      'Link the user\'s identified values to a concrete, specific, achievable action they will take — even in the presence of fear, discomfort, or difficult thoughts.',
    duration: '10–15 minutes',
    targetStates: ['stuck', 'procrastinating', 'avoidant', 'purposeless', 'low motivation'],
    contraindications: [
      'not appropriate if the user has not yet identified any values to anchor the action to',
    ],
    promptGuidance:
      'Ask the user which of their values is most calling to them right now. Then ask: "If you were living fully in alignment with that value this week, what is one small thing you would do?" Help them make it specific, small, and achievable — not "be more social" but "text one friend by Thursday." Acknowledge that anxiety or discomfort may show up; frame the action as happening alongside those feelings, not after they disappear. Follow up at next check-in: "How did it go? What showed up? Did you do it — and if not, what got in the way?"',
  },
];

// ── MI Techniques ─────────────────────────────────────────────────────────────

const MI_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'mi_decisional_balance',
    name: 'Decisional Balance',
    modality: TherapeuticModality.MI,
    description:
      'A structured exploration of the pros and cons of changing a behaviour versus staying the same, designed to surface and amplify the user\'s own motivation for change.',
    duration: '15–25 minutes',
    targetStates: ['ambivalent', 'stuck in a habit', 'resistant to change', 'conflicted'],
    contraindications: [
      'do not use when the user has already committed to change — it may introduce unnecessary doubt',
      'use carefully with eating disorders where ambivalence may be ego-syntonic',
    ],
    promptGuidance:
      'Frame this as a curious exploration, not a persuasion exercise. Ask the user to explore four quadrants together: (1) Benefits of the current behaviour — what does it give them? (2) Costs of the current behaviour. (3) Benefits of changing. (4) Costs of changing. Spend roughly equal time on all four. Do not argue against the benefits of the current behaviour — acknowledge them warmly. The goal is for the user to hear themselves articulate the costs and to amplify any change talk that emerges. Reflect change talk back: "So part of you really wants this."',
  },
  {
    id: 'mi_scaling_questions',
    name: 'Scaling Questions',
    modality: TherapeuticModality.MI,
    description:
      'Use numerical scales (0–10) to explore the user\'s readiness, importance, and confidence around change — and then explore what would move them one point higher.',
    duration: '5–10 minutes',
    targetStates: ['ambivalent', 'low confidence', 'unmotivated', 'stuck'],
    contraindications: [
      'avoid if user experiences the rating as judgment or pressure',
    ],
    promptGuidance:
      'Ask two questions: "On a scale of 0–10, how important is it to you to make this change?" Then: "On a scale of 0–10, how confident are you that you could make it if you decided to?" For whichever score is lower, ask: "You said [X] — what would need to happen for that to be one or two points higher?" This surfaces the real barriers without direct confrontation. Reflect what you hear carefully. Avoid asking "Why did you give yourself a low number?" — instead ask "Why did you give yourself a [X] and not a [lower number]?" to elicit existing motivation.',
  },
  {
    id: 'mi_importance_confidence_ruler',
    name: 'Importance-Confidence Ruler',
    modality: TherapeuticModality.MI,
    description:
      'A paired assessment of how important a change is to the user and how confident they feel about making it, used to identify whether support is needed on the motivation side or the capability side.',
    duration: '10–15 minutes',
    targetStates: ['low self-efficacy', 'stuck', 'overwhelmed by change', 'avoidant'],
    contraindications: [],
    promptGuidance:
      'After establishing the two ruler scores (importance and confidence), interpret them together. High importance + low confidence: focus on building skills, breaking the change into smaller steps, or identifying resources. Low importance + high confidence: explore what would make the change feel more personally meaningful — connect to values. Low on both: this is not the right moment to push for change; focus on exploration and trust-building. Summarise back what you hear and ask permission before suggesting any direction: "Would it be okay if we explored what might help with the confidence side?"',
  },
  {
    id: 'mi_change_talk_amplification',
    name: 'Change Talk Amplification',
    modality: TherapeuticModality.MI,
    description:
      'Actively listen for statements that indicate the user\'s own desire, ability, reasons, or need to change (DARN) and reflect, elaborate, and affirm these to strengthen the motivation.',
    duration: 'Ongoing throughout conversation',
    targetStates: ['ambivalent', 'resistant', 'low motivation', 'stuck'],
    contraindications: [
      'do not manufacture change talk that isn\'t present — it must come from the user',
    ],
    promptGuidance:
      'Listen carefully for any of the DARN change talk statements: Desire ("I want to…"), Ability ("I think I could…"), Reasons ("If I changed, it would…"), Need ("I really need to…"). When you hear one, pause and reflect it back with warmth: "So part of you does want this." Ask elaborating questions: "Tell me more about that." "What would that mean for you?" "What would be different if you did?" Avoid the righting reflex — do not immediately follow up with advice or a plan. Let the user stay with and deepen their own motivation first.',
  },
];

// ── CFT Techniques ────────────────────────────────────────────────────────────

const CFT_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'cft_self_compassion_letter',
    name: 'Compassionate Self-Letter',
    modality: TherapeuticModality.CFT,
    description:
      'Write a letter to yourself from the perspective of a deeply compassionate friend who fully understands your situation — acknowledging pain, normalising struggle, and offering encouragement without toxic positivity.',
    duration: '15–25 minutes',
    targetStates: ['self-critical', 'ashamed', 'depressed', 'perfectionist', 'failure mindset'],
    contraindications: [
      'may be confronting for users with very high levels of shame — pace carefully',
      'avoid if the user is not yet ready to consider self-compassion as valid',
    ],
    promptGuidance:
      'First normalise the exercise: "This might feel awkward at first — most of us are kinder to others than to ourselves." Ask the user to think of a wise, compassionate friend who knows them deeply and cares for them unconditionally. This friend sees their struggle without judgment. Invite them to write (or dictate to you) what that friend would say about the situation they\'re in right now. If they get stuck, offer sentence starters: "I can see how hard you\'ve been trying…" or "Of course you feel this way, because…" After, reflect on what it felt like to receive those words.',
  },
  {
    id: 'cft_inner_critic_dialogue',
    name: 'Inner Critic Dialogue',
    modality: TherapeuticModality.CFT,
    description:
      'Externalise the inner critic — giving it a voice, understanding its underlying intent, and then responding to it from the compassionate self rather than being overwhelmed by it.',
    duration: '15–20 minutes',
    targetStates: ['self-critical', 'ruminating', 'shame', 'perfectionism'],
    contraindications: [
      'use carefully with psychosis — externalising voices may be destabilising',
      'if the critic is very hostile, ensure the compassionate self is established before engaging with the critic directly',
    ],
    promptGuidance:
      'Ask the user: "If your inner critic were a character — what would it look like? What voice does it use? What does it most often say?" Let them describe it fully. Then ask: "If that critic is trying to protect you in some way, what might it be afraid of?" (often: failure, rejection, being unlovable). Acknowledge the critic\'s underlying concern. Then ask: "What would your compassionate self say back to that critic — not to fight it, but to thank it and offer a more helpful perspective?" This triangulates rather than suppressing the critical voice.',
  },
  {
    id: 'cft_soothing_rhythm_breathing',
    name: 'Soothing Rhythm Breathing',
    modality: TherapeuticModality.CFT,
    description:
      'A specific breathing rhythm (approximately 5–6 breaths per minute with equal inhale and exhale) designed to activate the parasympathetic system and the affiliative emotional system, supporting a felt sense of safety.',
    duration: '5–10 minutes',
    targetStates: ['anxious', 'self-critical', 'overwhelmed', 'shame spiralling'],
    contraindications: [
      'some users experience anxiety when focusing on breath — offer alternative grounding if needed',
    ],
    promptGuidance:
      'Guide the user to find a comfortable position. Invite them to slow their breath naturally — in for 5 seconds, out for 5 seconds, with a small pause at the top and bottom. Encourage a gentle facial expression — a slight upward turn of the lips, sometimes called a "half-smile" — as facial muscles signal safety to the nervous system. After 2–3 minutes, ask them to bring to mind a quality they\'d like to embody: warmth, kindness, strength. Hold that quality with each breath. Close by asking: "What do you notice in your body after that?"',
  },
  {
    id: 'cft_compassionate_image',
    name: 'Compassionate Image',
    modality: TherapeuticModality.CFT,
    description:
      'Develop a personalised image of an ideal compassionate being — human, animal, or symbolic — that the user can call upon as an internal resource when feeling overwhelmed, judged, or alone.',
    duration: '10–20 minutes',
    targetStates: ['lonely', 'ashamed', 'anxious', 'self-critical', 'attachment-wounded'],
    contraindications: [
      'users with strong distrust of care or severe attachment trauma may find compassionate imagery threatening — proceed very gently',
    ],
    promptGuidance:
      'Invite the user to imagine an ideal compassionate presence. This is not a real person but an ideal: someone (or something) with infinite wisdom, warmth, and courage — who is completely on their side. Ask: "What does this being look like? What does their presence feel like?" Help them build the image with sensory detail: warmth, steadiness, the quality of their gaze. Then ask: "What would this being say to you right now?" Once established, this image can be called upon between sessions as a self-soothing resource. Revisit and deepen it over multiple sessions.',
  },
];

// ── Behavioural Activation Techniques ────────────────────────────────────────

const BA_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'ba_activity_scheduling',
    name: 'Activity Scheduling',
    modality: TherapeuticModality.BehaviouralActivation,
    description:
      'Deliberately plan and schedule activities — particularly those that provide pleasure or a sense of accomplishment — to break the cycle of depression-driven withdrawal.',
    duration: '15–20 minutes to plan; ongoing daily execution',
    targetStates: ['depressed', 'withdrawn', 'anhedonic', 'low motivation', 'fatigued'],
    contraindications: [
      'do not schedule activities so demanding they set up a failure experience — start very small',
    ],
    promptGuidance:
      'Explain the depression-withdrawal loop: low mood leads to withdrawal, which leads to lower mood. Activity is medicine. Help the user identify 3 categories of activity: (1) Necessary tasks that give a sense of accomplishment, (2) Pleasurable activities (even mildly so), (3) Social activities. Start small — not "go to the gym" but "put on trainers." Ask: "What is one thing, however small, you could do tomorrow that you used to enjoy, even just a little?" Schedule it with a specific time. Celebrate completion, not performance.',
  },
  {
    id: 'ba_pleasure_mastery',
    name: 'Pleasure-Mastery Tracking',
    modality: TherapeuticModality.BehaviouralActivation,
    description:
      'Monitor daily activities by rating them for both pleasure (enjoyment) and mastery (sense of accomplishment), revealing which activities are genuinely restorative and challenging the belief that "nothing helps."',
    duration: '5 minutes per day',
    targetStates: ['depressed', 'anhedonic', 'hopeless', 'all-or-nothing thinking'],
    contraindications: [
      'avoid if the user experiences tracking as another demand that increases guilt or pressure',
    ],
    promptGuidance:
      'Set up a simple daily log. For each activity, the user rates Pleasure (P: 0–10) and Mastery (M: 0–10). Review together after 3–5 days. Often users discover that some activities score higher than their depressed mind predicted. Highlight this: "Notice that you rated [activity] a P5 — your mind said it wouldn\'t help, but it did." Also explore mastery ratings — even getting out of bed can be a 9/10 mastery when severely depressed. Use this data to argue against nihilistic thinking.',
  },
  {
    id: 'ba_graded_task_assignment',
    name: 'Graded Task Assignment',
    modality: TherapeuticModality.BehaviouralActivation,
    description:
      'Break a daunting task down into the smallest possible steps and tackle them sequentially, building confidence and momentum while avoiding the paralysis of overwhelm.',
    duration: '15–20 minutes to plan; varies to execute',
    targetStates: ['overwhelmed', 'procrastinating', 'depressed', 'low energy', 'avoidant'],
    contraindications: [
      'not appropriate as a primary intervention if the task avoidance is driven by trauma — explore that first',
    ],
    promptGuidance:
      'Ask the user to name one task that has been hanging over them. Then say: "Let\'s break this down so small it feels almost silly." Guide them to list every micro-step — not "write the report" but "open the document," then "write the title," then "write the first sentence." Assign only the first 1–2 steps as homework. When they complete even one micro-step, affirm it warmly — it is evidence against "I can\'t do anything." Build on each small win.',
  },
  {
    id: 'ba_social_prescription',
    name: 'Social Prescription',
    modality: TherapeuticModality.BehaviouralActivation,
    description:
      'Reconnect the user with community, social, or meaningful activities as a deliberate therapeutic intervention — recognising that isolation is both a symptom and a driver of depression.',
    duration: '15–20 minutes to explore; ongoing',
    targetStates: ['isolated', 'depressed', 'withdrawn', 'lonely', 'purposeless'],
    contraindications: [
      'severe social anxiety — may need phased approach starting with lower-demand social contact',
      'do not prescribe social activities that feel unsafe or coercive',
    ],
    promptGuidance:
      'Ask the user: "What kinds of connection used to matter to you?" and "What\'s standing between you and that now?" Explore low-threshold options: a walking group, volunteering, a hobby class, even an online community. Help them identify one specific social activity to try in the next week. Troubleshoot barriers: "What might get in the way, and how could we plan for that?" Follow up on how it felt — even brief or awkward social contact can count as a step. Connect the activity back to values where possible.',
  },
];

// ── Mindfulness Techniques ────────────────────────────────────────────────────

const MINDFULNESS_TECHNIQUES: TherapeuticTechnique[] = [
  {
    id: 'mindfulness_body_scan',
    name: 'Body Scan',
    modality: TherapeuticModality.Mindfulness,
    description:
      'A progressive mindfulness practice of moving attention through the body from feet to head, noticing physical sensations with curiosity and without judgment — anchoring awareness in the present moment.',
    duration: '10–20 minutes',
    targetStates: ['anxious', 'tense', 'dissociated', 'restless', 'stressed'],
    contraindications: [
      'trauma survivors may experience distress when attention is directed to certain body areas — offer choice and allow skipping',
      'some people experience heightened anxiety with body-focused attention — offer an alternative',
    ],
    promptGuidance:
      'Guide the user to lie down or sit comfortably. Start at the feet: "Bring your attention to the soles of your feet. What do you notice? Warmth? Pressure? Tingling? Nothing at all? There\'s no right answer." Move slowly upward: feet, calves, knees, thighs, hips, abdomen, chest, hands, arms, shoulders, neck, face, top of the head. At each region, invite noticing — not changing. If there is tension, suggest breathing into that area. Close with a full-body awareness moment. After: "What stood out? Did anything surprise you?"',
  },
  {
    id: 'mindfulness_54321_grounding',
    name: '5-4-3-2-1 Grounding',
    modality: TherapeuticModality.Mindfulness,
    description:
      'A rapid sensory grounding technique that anchors attention to the present moment by sequentially naming things seen, heard, touched, smelled, and tasted — useful for anxiety and dissociation.',
    duration: '3–5 minutes',
    targetStates: ['panic', 'dissociating', 'anxious', 'overwhelmed', 'flashback'],
    contraindications: [
      'rarely contraindicated; one of the safest and most accessible grounding techniques',
    ],
    promptGuidance:
      'Guide the user through each sensory level in order. 5 — things they can see right now (describe colours, shapes). 4 — things they can physically feel/touch (the chair, their feet on the floor). 3 — things they can hear (internal and external sounds). 2 — things they can smell (or two things they like the smell of). 1 — something they can taste (or a favourite taste to bring to mind). Encourage slow, deliberate noticing. After: "How are you feeling now compared to a few minutes ago?" This is particularly useful at the start of a session if the user arrives distressed.',
  },
  {
    id: 'mindfulness_breath_awareness',
    name: 'Breath Awareness',
    modality: TherapeuticModality.Mindfulness,
    description:
      'A foundational mindfulness practice of resting attention on the natural breath — noticing the sensations of each inhale and exhale — to cultivate present-moment awareness and calm.',
    duration: '5–10 minutes',
    targetStates: ['anxious', 'restless', 'stressed', 'distracted', 'overthinking'],
    contraindications: [
      'breath-focused practices can increase anxiety in some individuals — offer body or sound anchors as alternatives',
    ],
    promptGuidance:
      'Invite the user to find a comfortable position and let their breath settle naturally — they do not need to control it. Suggest they notice the breath at the nostrils (coolness of the inhale), the chest, or the belly — wherever they feel it most clearly. When thoughts arise (and they will), simply label them gently: "thinking" — and return to the breath without self-criticism. Normalise wandering: "The practice is in the returning, not the staying." After: "How many times do you think your mind wandered?" (Always many — this is normal and not failure.)',
  },
  {
    id: 'mindfulness_self_compassion',
    name: 'Mindful Self-Compassion',
    modality: TherapeuticModality.Mindfulness,
    description:
      'A structured mindfulness practice integrating three components: mindfulness (acknowledging the pain), common humanity (recognising we all suffer), and self-kindness (offering warmth to oneself).',
    duration: '10–15 minutes',
    targetStates: ['self-critical', 'ashamed', 'isolated in suffering', 'perfectionistic'],
    contraindications: [
      'very high shame levels — the self-compassion touch may initially increase pain before decreasing it; pace carefully',
    ],
    promptGuidance:
      'Guide the user through three steps. First, Mindfulness: "What are you feeling right now? Can you name it without judgment? \'This is a moment of suffering.\'" Second, Common Humanity: "Suffering is part of being human. You are not alone in this. Others feel this way too." Third, Self-Kindness: "What would you say to a dear friend in this situation? Can you offer those same words to yourself?" Invite them to place a hand on their heart if that feels comfortable. Offer a self-compassion phrase: "May I be kind to myself. May I give myself what I need right now." After: "What was that like?"',
  },
];

// ── Full Technique Library ────────────────────────────────────────────────────

export const THERAPEUTIC_TECHNIQUES: TherapeuticTechnique[] = [
  ...CBT_TECHNIQUES,
  ...DBT_TECHNIQUES,
  ...ACT_TECHNIQUES,
  ...MI_TECHNIQUES,
  ...CFT_TECHNIQUES,
  ...BA_TECHNIQUES,
  ...MINDFULNESS_TECHNIQUES,
];

// ── Query Helpers ─────────────────────────────────────────────────────────────

/**
 * Return all techniques belonging to a given modality.
 */
export function getTechniquesForModality(
  modality: TherapeuticModality,
): TherapeuticTechnique[] {
  return THERAPEUTIC_TECHNIQUES.filter((t) => t.modality === modality);
}

/**
 * Look up a specific technique by its unique ID.
 */
export function getTechniqueById(id: string): TherapeuticTechnique | undefined {
  return THERAPEUTIC_TECHNIQUES.find((t) => t.id === id);
}

/**
 * Return all techniques whose targetStates include a substring match for
 * the given state string (case-insensitive).
 */
export function matchTechniquesToState(targetState: string): TherapeuticTechnique[] {
  const lower = targetState.toLowerCase();
  return THERAPEUTIC_TECHNIQUES.filter((t) =>
    t.targetStates.some((s) => s.toLowerCase().includes(lower)),
  );
}
