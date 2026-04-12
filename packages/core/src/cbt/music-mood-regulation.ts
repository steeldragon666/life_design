import type { MoodClassification, SpotifyAudioFeatures } from '../integrations/spotify-mood';
import { CBT_TECHNIQUES } from './technique-library';
import type { CBTTechnique } from './technique-library';
import { matchTechniquesToMood } from './mood-technique-matcher';

export interface MusicCBTSuggestion {
  technique: CBTTechnique;
  musicGuidance: {
    recommendedTempo: 'slow' | 'moderate' | 'upbeat';
    recommendedValence: 'low' | 'neutral' | 'high';
    recommendedEnergy: 'low' | 'moderate' | 'high';
    description: string;
  };
  rationale: string;
  estimatedDuration: string;
}

export interface RegulationSession {
  id: string;
  timestamp: string;
  moodBefore: MoodClassification;
  moodAfter?: MoodClassification;
  techniqueUsed: string;
  musicPlayed: boolean;
  effectiveness?: number;
  completed: boolean;
}

export interface RegulationEffectiveness {
  techniqueId: string;
  techniqueName: string;
  timesUsed: number;
  avgEffectiveness: number;
  withMusicAvg: number;
  withoutMusicAvg: number;
  bestMoodPairing: string;
  completionRate: number;
}

/**
 * Maps a target mood to recommended music characteristics.
 *
 * Educational note: these suggestions are informed by research on the
 * iso-principle in music therapy — starting close to the listener's current
 * emotional state and gradually shifting toward the desired state.
 */
export function getMusicGuidanceForMood(
  targetMood: string,
): MusicCBTSuggestion['musicGuidance'] {
  switch (targetMood) {
    case 'tense':
      return {
        recommendedTempo: 'slow',
        recommendedValence: 'neutral',
        recommendedEnergy: 'low',
        description:
          'Try pairing this with calm, acoustic music (60-80 BPM). Slow tempos and low energy can help activate the parasympathetic nervous system.',
      };
    case 'melancholic':
      return {
        recommendedTempo: 'moderate',
        recommendedValence: 'neutral',
        recommendedEnergy: 'moderate',
        description:
          'Consider music with a moderate tempo (80-110 BPM) and gradually uplifting tone. Starting neutral and building toward positive helps avoid emotional invalidation.',
      };
    case 'energetic':
      return {
        recommendedTempo: 'moderate',
        recommendedValence: 'neutral',
        recommendedEnergy: 'moderate',
        description:
          'Grounding music at a moderate tempo (90-110 BPM) may help channel excess energy into focused awareness.',
      };
    case 'calm':
      return {
        recommendedTempo: 'slow',
        recommendedValence: 'high',
        recommendedEnergy: 'low',
        description:
          'Gentle, positive music (60-90 BPM) can complement a calm state and support reflective practices.',
      };
    case 'happy':
      return {
        recommendedTempo: 'moderate',
        recommendedValence: 'high',
        recommendedEnergy: 'moderate',
        description:
          'Warm, uplifting music at a comfortable tempo (90-120 BPM) can support values-aligned reflection while maintaining positive energy.',
      };
    default:
      return {
        recommendedTempo: 'moderate',
        recommendedValence: 'neutral',
        recommendedEnergy: 'moderate',
        description:
          'Choose music that feels comfortable and supportive for your current state.',
      };
  }
}

const RATIONALE_MAP: Record<string, Record<string, string>> = {
  tense: {
    relaxation:
      'Relaxation techniques paired with calming music can help reduce physiological arousal and promote a sense of safety.',
    mindfulness:
      'Mindfulness practices with slow music can help shift attention away from anxious thoughts and toward present-moment awareness.',
    cognitive_restructuring:
      'Challenging tense thoughts while listening to calming music may create a supportive environment for reframing.',
    behavioural_activation:
      'Engaging in a pleasant activity with soothing background music can help interrupt the tension cycle.',
  },
  melancholic: {
    cognitive_restructuring:
      'Reframing negative thoughts alongside gradually uplifting music may help shift perspective without forcing positivity.',
    behavioural_activation:
      'Scheduling a small pleasurable activity with supportive music can gently counteract low mood.',
    mindfulness:
      'Mindful awareness with gentle music may help observe sadness without being overwhelmed by it.',
    relaxation:
      'Relaxation with moderate-paced music can ease the physical heaviness that often accompanies low mood.',
  },
  energetic: {
    relaxation:
      'Breathing exercises with grounding music can help channel high energy into calm focus.',
    mindfulness:
      'Body awareness practices paired with moderate-tempo music can help ground excess energy into present-moment focus.',
    cognitive_restructuring:
      'Reflective techniques with grounding music may help direct high energy toward constructive thinking.',
    behavioural_activation:
      'Pairing purposeful activity with grounding music can help channel energy productively.',
  },
  calm: {
    behavioural_activation:
      'A calm state is a good time to plan values-aligned activities with gentle, positive background music.',
    cognitive_restructuring:
      'Calm moments with gentle music are ideal for reflective thinking and building cognitive flexibility.',
    mindfulness:
      'Deepening calm awareness with soft music can strengthen mindfulness skills for more challenging moments.',
    relaxation:
      'Gentle relaxation with positive music can consolidate a calm state and build resilience.',
  },
  happy: {
    behavioural_activation:
      'Positive moods are a great time to reinforce value-driven habits with warm, uplifting music.',
    cognitive_restructuring:
      'Happy moments with uplifting music are ideal for building a library of balanced, positive thoughts.',
    mindfulness:
      'Mindful savouring of positive emotions with warm music can extend and deepen happiness.',
    relaxation:
      'Gentle relaxation with positive music during happy moments can build a strong foundation for future regulation.',
  },
};

function getRationale(mood: string, category: string): string {
  return (
    RATIONALE_MAP[mood]?.[category] ??
    'This technique may support emotional well-being. Consider pairing it with music that feels right for you.'
  );
}

/**
 * Suggest CBT techniques paired with music guidance based on current mood
 * and optional current listening context.
 *
 * Educational note: these are suggestions for self-exploration, not clinical
 * prescriptions. If you are in distress, please reach out to a mental health
 * professional.
 */
export function suggestRegulation(
  mood: MoodClassification,
  audioFeatures?: SpotifyAudioFeatures,
): MusicCBTSuggestion[] {
  const techniques = matchTechniquesToMood(mood);
  const baseGuidance = getMusicGuidanceForMood(mood.primaryMood);

  // Sort: for tense mood, prefer relaxation/mindfulness first
  const sorted = [...techniques].sort((a, b) => {
    if (mood.primaryMood === 'tense') {
      const priority: Record<string, number> = {
        relaxation: 0,
        mindfulness: 1,
        cognitive_restructuring: 2,
        behavioural_activation: 3,
      };
      return (priority[a.category] ?? 9) - (priority[b.category] ?? 9);
    }
    return 0;
  });

  return sorted.map((technique) => {
    let musicGuidance = { ...baseGuidance };

    // Tailor guidance when we know the user's current listening context
    if (audioFeatures) {
      if (audioFeatures.energy > 0.7 && mood.primaryMood === 'tense') {
        musicGuidance = {
          ...musicGuidance,
          recommendedEnergy: 'low',
          recommendedTempo: 'slow',
          description:
            'Your current music is quite energetic. Consider gradually transitioning to slower, calmer tracks (60-80 BPM) to support relaxation.',
        };
      } else if (audioFeatures.energy > 0.7 && mood.primaryMood === 'energetic') {
        musicGuidance = {
          ...musicGuidance,
          recommendedEnergy: 'moderate',
          description:
            'Your current music matches your high energy. Try transitioning to moderate-tempo tracks to help ground your focus.',
        };
      }
    }

    return {
      technique,
      musicGuidance,
      rationale: getRationale(mood.primaryMood, technique.category),
      estimatedDuration: technique.duration,
    };
  });
}

/**
 * Aggregate effectiveness statistics per technique from completed regulation sessions.
 * Requires at least 2 completed sessions with an effectiveness rating per technique
 * to produce meaningful stats.
 */
export function computeRegulationEffectiveness(
  sessions: RegulationSession[],
): RegulationEffectiveness[] {
  // Group sessions by technique
  const grouped = new Map<string, RegulationSession[]>();
  for (const session of sessions) {
    const existing = grouped.get(session.techniqueUsed) ?? [];
    existing.push(session);
    grouped.set(session.techniqueUsed, existing);
  }

  const results: RegulationEffectiveness[] = [];

  for (const [techniqueId, techniqueSessions] of grouped) {
    const completedWithRating = techniqueSessions.filter(
      (s) => s.completed && s.effectiveness != null,
    );

    // Require at least 2 completed rated sessions
    if (completedWithRating.length < 2) continue;

    const technique = CBT_TECHNIQUES.find((t) => t.id === techniqueId);
    const techniqueName = technique?.name ?? techniqueId;

    const totalCompleted = techniqueSessions.filter((s) => s.completed).length;
    const completionRate = totalCompleted / techniqueSessions.length;

    const avgEffectiveness =
      completedWithRating.reduce((sum, s) => sum + (s.effectiveness ?? 0), 0) /
      completedWithRating.length;

    const withMusic = completedWithRating.filter((s) => s.musicPlayed);
    const withoutMusic = completedWithRating.filter((s) => !s.musicPlayed);

    const withMusicAvg =
      withMusic.length > 0
        ? withMusic.reduce((sum, s) => sum + (s.effectiveness ?? 0), 0) / withMusic.length
        : 0;

    const withoutMusicAvg =
      withoutMusic.length > 0
        ? withoutMusic.reduce((sum, s) => sum + (s.effectiveness ?? 0), 0) / withoutMusic.length
        : 0;

    // Find best mood pairing: mood with highest avg effectiveness
    const moodEffectiveness = new Map<string, { total: number; count: number }>();
    for (const s of completedWithRating) {
      const mood = s.moodBefore.primaryMood;
      const entry = moodEffectiveness.get(mood) ?? { total: 0, count: 0 };
      entry.total += s.effectiveness ?? 0;
      entry.count += 1;
      moodEffectiveness.set(mood, entry);
    }

    let bestMoodPairing = completedWithRating[0].moodBefore.primaryMood;
    let bestMoodAvg = 0;
    for (const [mood, { total, count }] of moodEffectiveness) {
      const avg = total / count;
      if (avg > bestMoodAvg) {
        bestMoodAvg = avg;
        bestMoodPairing = mood;
      }
    }

    results.push({
      techniqueId,
      techniqueName,
      timesUsed: completedWithRating.length,
      avgEffectiveness: Math.round(avgEffectiveness * 100) / 100,
      withMusicAvg: Math.round(withMusicAvg * 100) / 100,
      withoutMusicAvg: Math.round(withoutMusicAvg * 100) / 100,
      bestMoodPairing,
      completionRate: Math.round(completionRate * 100) / 100,
    });
  }

  return results;
}

/**
 * Generate a human-readable insight from effectiveness data.
 *
 * Educational note: insights are meant to support self-awareness and
 * exploration of what works for you — not clinical guidance.
 */
export function generateRegulationInsight(
  effectiveness: RegulationEffectiveness[],
): string {
  if (effectiveness.length === 0) return '';

  // Find top technique by avg effectiveness
  const sorted = [...effectiveness].sort(
    (a, b) => b.avgEffectiveness - a.avgEffectiveness,
  );
  const top = sorted[0];

  let insight = `${top.techniqueName} has been your most effective technique (${top.avgEffectiveness}/5 avg over ${top.timesUsed} sessions).`;

  // Check for significant music impact across all techniques
  const significantMusicDiff = effectiveness.find(
    (e) =>
      e.withMusicAvg > 0 &&
      e.withoutMusicAvg > 0 &&
      Math.abs(e.withMusicAvg - e.withoutMusicAvg) >= 0.5,
  );

  if (significantMusicDiff) {
    const better =
      significantMusicDiff.withMusicAvg > significantMusicDiff.withoutMusicAvg
        ? 'with'
        : 'without';
    const higherAvg = Math.max(
      significantMusicDiff.withMusicAvg,
      significantMusicDiff.withoutMusicAvg,
    );
    insight += ` ${significantMusicDiff.techniqueName} tends to work better ${better} music (${higherAvg}/5 avg).`;
  }

  return insight;
}
