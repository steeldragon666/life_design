import type { MoodClassification } from '../integrations/spotify-mood';
import { CBT_TECHNIQUES } from './technique-library';
import type { CBTTechnique } from './technique-library';

export function matchTechniquesToMood(mood: MoodClassification): CBTTechnique[] {
  return CBT_TECHNIQUES
    .filter(t => t.targetMoods.includes(mood.primaryMood))
    .sort((a, b) => {
      // Prefer shorter techniques when mood is 'tense' (lower barrier)
      const parseDuration = (d: string): number => parseInt(d, 10) || 0;
      if (mood.primaryMood === 'tense') {
        return parseDuration(a.duration) - parseDuration(b.duration);
      }
      return 0;
    });
}
