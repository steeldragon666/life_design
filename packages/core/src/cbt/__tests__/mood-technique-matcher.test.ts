import { describe, it, expect } from 'vitest';
import { matchTechniquesToMood } from '../mood-technique-matcher';
import type { CBTTechnique } from '../technique-library';
import type { MoodClassification } from '../../integrations/spotify-mood';

function makeMood(primaryMood: MoodClassification['primaryMood']): MoodClassification {
  return { primaryMood, valenceScore: 0.5, energyScore: 0.5, confidence: 0.8 };
}

describe('matchTechniquesToMood', () => {
  it('returns techniques targeting melancholic mood (thought record, behavioural activation, gratitude)', () => {
    const results = matchTechniquesToMood(makeMood('melancholic'));
    const ids = results.map((t) => t.id);
    expect(ids).toContain('thought_record');
    expect(ids).toContain('behavioural_activation');
    expect(ids).toContain('gratitude_list');
    expect(results.length).toBe(3);
  });

  it('returns techniques for tense mood sorted by duration (breathing first)', () => {
    const results = matchTechniquesToMood(makeMood('tense'));
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0].id).toBe('breathing_4_7_8');
    // Verify sorted by duration ascending
    for (let i = 1; i < results.length; i++) {
      expect(parseInt(results[i].duration)).toBeGreaterThanOrEqual(
        parseInt(results[i - 1].duration),
      );
    }
  });

  it('returns values check-in for happy mood', () => {
    const results = matchTechniquesToMood(makeMood('happy'));
    const ids = results.map((t) => t.id);
    expect(ids).toContain('values_check');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns relaxation/mindfulness techniques for energetic mood', () => {
    const results = matchTechniquesToMood(makeMood('energetic'));
    const ids = results.map((t) => t.id);
    expect(ids).toContain('breathing_4_7_8');
    expect(ids).toContain('body_scan');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('every returned technique has a valid structure', () => {
    const moods: MoodClassification['primaryMood'][] = [
      'energetic',
      'happy',
      'calm',
      'melancholic',
      'tense',
    ];

    for (const mood of moods) {
      const results = matchTechniquesToMood(makeMood(mood));
      expect(results.length).toBeGreaterThan(0);
      for (const technique of results) {
        expect(technique).toHaveProperty('id');
        expect(technique).toHaveProperty('name');
        expect(technique).toHaveProperty('category');
        expect(technique).toHaveProperty('description');
        expect(technique).toHaveProperty('duration');
        expect(technique).toHaveProperty('targetMoods');
        expect(['cognitive_restructuring', 'behavioural_activation', 'mindfulness', 'relaxation']).toContain(
          technique.category,
        );
        expect(technique.targetMoods).toContain(mood);
      }
    }
  });
});
