type GoalHorizon = 'short' | 'medium' | 'long';

export interface ExtractedGoal {
  title: string;
  horizon: GoalHorizon;
  description?: string;
}

export interface ExtractedProfile {
  name?: string;
  location?: string;
  profession?: string;
  interests?: string[];
  hobbies?: string[];
  maritalStatus?: string;
  goals?: ExtractedGoal[];
}

export interface ConversationMessageLike {
  role: 'user' | 'assistant';
  content: string;
}

function parseMaybeJson(raw: string): ExtractedProfile | null {
  try {
    const parsed = JSON.parse(raw) as ExtractedProfile;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = text.indexOf('{');
  if (firstBrace < 0) return null;
  let depth = 0;
  for (let index = firstBrace; index < text.length; index++) {
    const char = text[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(firstBrace, index + 1);
      }
    }
  }
  return null;
}

function splitList(text: string): string[] {
  return text
    .split(/,| and /i)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function inferGoalHorizon(goalText: string): GoalHorizon {
  const value = goalText.toLowerCase();
  if (/this week|this month|next month|soon/.test(value)) return 'short';
  if (/this year|12 months|next year/.test(value)) return 'medium';
  if (/2 years|3 years|5 years|long term|someday/.test(value)) return 'long';
  return 'medium';
}

export function parseExtractedProfileFromText(text: string): ExtractedProfile | null {
  if (!text.trim()) return null;
  const direct = parseMaybeJson(text);
  if (direct) return direct;

  const jsonBlock = extractJsonBlock(text);
  if (!jsonBlock) return null;
  return parseMaybeJson(jsonBlock);
}

export function extractProfileDeterministically(
  conversation: ConversationMessageLike[],
): ExtractedProfile {
  const userText = conversation
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join(' ');

  const profile: ExtractedProfile = {};

  const nameMatch = userText.match(/\bmy name is\s+([A-Za-z][A-Za-z'\- ]{1,40})/i);
  if (nameMatch?.[1]) {
    profile.name = nameMatch[1].trim().split(' ')[0];
  }

  const locationMatch = userText.match(/\b(?:i live in|i am based in|i'm from|i am from)\s+([A-Za-z][A-Za-z'\- ]{1,60})/i);
  if (locationMatch?.[1]) {
    profile.location = locationMatch[1].trim().replace(/[.,;]$/, '');
  }

  const professionMatch = userText.match(/\b(?:i am|i'm|i work as|i work as a|i am a|i am an)\s+(?:an?\s+)?([A-Za-z][A-Za-z\- ]{2,60})/i);
  if (professionMatch?.[1]) {
    const value = professionMatch[1].trim().replace(/[.,;]$/, '');
    if (!/married|single|from|based|living/i.test(value)) {
      profile.profession = value.toLowerCase();
    }
  }

  const maritalMatch = userText.match(/\b(single|married|partnered|divorced|widowed)\b/i);
  if (maritalMatch?.[1]) {
    profile.maritalStatus = maritalMatch[1].toLowerCase();
  }

  const interestsMatch = userText.match(/\b(?:i enjoy|i like|my interests include|interests include)\s+([^.!?]+)/i);
  if (interestsMatch?.[1]) {
    profile.interests = splitList(interestsMatch[1]);
  }

  const hobbiesMatch = userText.match(/\b(?:my hobbies include|hobbies include)\s+([^.!?]+)/i);
  if (hobbiesMatch?.[1]) {
    profile.hobbies = splitList(hobbiesMatch[1]);
  } else if (profile.interests?.length) {
    profile.hobbies = [...profile.interests];
  }

  const goalMatch = userText.match(/\b(?:my goal is to|i want to|i'd like to|i would like to)\s+([^.!?]+)/i);
  if (goalMatch?.[1]) {
    const goalText = goalMatch[1].trim().replace(/[.,;]$/, '');
    profile.goals = [
      {
        title: goalText,
        horizon: inferGoalHorizon(goalText),
      },
    ];
  }

  return profile;
}

export function mergeExtractedProfiles(
  previous: ExtractedProfile,
  incoming: ExtractedProfile,
): ExtractedProfile {
  const mergedInterests = [
    ...(previous.interests ?? []),
    ...(incoming.interests ?? []),
  ];
  const mergedHobbies = [
    ...(previous.hobbies ?? []),
    ...(incoming.hobbies ?? []),
  ];
  const mergedGoals = [
    ...(previous.goals ?? []),
    ...(incoming.goals ?? []),
  ];

  return {
    ...previous,
    ...incoming,
    interests: [...new Set(mergedInterests.map((value) => value.trim().toLowerCase()))].filter(Boolean),
    hobbies: [...new Set(mergedHobbies.map((value) => value.trim().toLowerCase()))].filter(Boolean),
    goals: mergedGoals.length
      ? mergedGoals.filter((goal) => goal?.title?.trim())
      : undefined,
  };
}
