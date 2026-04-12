import { describe, it, expect } from 'vitest';
import {
  suggestRegulation,
  computeRegulationEffectiveness,
  generateRegulationInsight,
  getMusicGuidanceForMood,
} from '../music-mood-regulation';
import type {
  MusicCBTSuggestion,
  RegulationSession,
  RegulationEffectiveness,
} from '../music-mood-regulation';
import type { MoodClassification, SpotifyAudioFeatures } from '../../integrations/spotify-mood';

function makeMood(
  primaryMood: MoodClassification['primaryMood'],
  overrides?: Partial<MoodClassification>,
): MoodClassification {
  return { primaryMood, valenceScore: 0.5, energyScore: 0.5, confidence: 0.8, ...overrides };
}

function makeSession(overrides: Partial<RegulationSession> = {}): RegulationSession {
  return {
    id: 'session-1',
    timestamp: '2026-04-12T10:00:00Z',
    moodBefore: makeMood('tense'),
    techniqueUsed: 'breathing_4_7_8',
    musicPlayed: true,
    completed: true,
    ...overrides,
  };
}

describe('suggestRegulation', () => {
  it('returns techniques for melancholic mood', () => {
    const results = suggestRegulation(makeMood('melancholic'));
    expect(results.length).toBeGreaterThan(0);
    const techniqueIds = results.map((r) => r.technique.id);
    expect(techniqueIds).toContain('thought_record');
    expect(techniqueIds).toContain('gratitude_list');
  });

  it('returns relaxation techniques first for tense mood', () => {
    const results = suggestRegulation(makeMood('tense'));
    expect(results.length).toBeGreaterThan(0);
    // Relaxation and mindfulness should come before cognitive techniques for tense mood
    const firstCategories = results.slice(0, 2).map((r) => r.technique.category);
    expect(firstCategories).toContain('relaxation');
  });

  it('includes rationale for each suggestion', () => {
    const results = suggestRegulation(makeMood('melancholic'));
    for (const suggestion of results) {
      expect(suggestion.rationale).toBeTruthy();
      expect(typeof suggestion.rationale).toBe('string');
      expect(suggestion.rationale.length).toBeGreaterThan(10);
    }
  });

  it('includes estimatedDuration for each suggestion', () => {
    const results = suggestRegulation(makeMood('tense'));
    for (const suggestion of results) {
      expect(suggestion.estimatedDuration).toBeTruthy();
    }
  });

  it('tailors when audioFeatures show high energy (current listening is energetic)', () => {
    const highEnergyFeatures: SpotifyAudioFeatures = {
      valence: 0.3,
      energy: 0.9,
      danceability: 0.7,
      tempo: 140,
      acousticness: 0.1,
      instrumentalness: 0.2,
    };
    const results = suggestRegulation(makeMood('tense'), highEnergyFeatures);
    expect(results.length).toBeGreaterThan(0);
    // When already listening to high-energy music while tense, guidance should recommend
    // gradually calming music rather than abrupt change
    const firstGuidance = results[0].musicGuidance;
    expect(firstGuidance.recommendedEnergy).not.toBe('high');
  });

  it('returns suggestions for calm mood', () => {
    const results = suggestRegulation(makeMood('calm'));
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns suggestions for happy mood', () => {
    const results = suggestRegulation(makeMood('happy'));
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('getMusicGuidanceForMood', () => {
  it('recommends slow tempo and low energy for tense mood', () => {
    const guidance = getMusicGuidanceForMood('tense');
    expect(guidance.recommendedTempo).toBe('slow');
    expect(guidance.recommendedEnergy).toBe('low');
  });

  it('recommends moderate tempo and gradually higher valence for melancholic mood', () => {
    const guidance = getMusicGuidanceForMood('melancholic');
    expect(guidance.recommendedTempo).toBe('moderate');
    expect(guidance.recommendedValence).toBe('neutral');
  });

  it('recommends gentle music for calm mood', () => {
    const guidance = getMusicGuidanceForMood('calm');
    expect(guidance.recommendedTempo).toBe('slow');
    expect(guidance.recommendedValence).toBe('high');
    expect(guidance.recommendedEnergy).toBe('low');
  });

  it('returns guidance with a description for each mood', () => {
    const moods = ['happy', 'energetic', 'calm', 'melancholic', 'tense'] as const;
    for (const mood of moods) {
      const guidance = getMusicGuidanceForMood(mood);
      expect(guidance.description).toBeTruthy();
      expect(guidance.description.length).toBeGreaterThan(10);
    }
  });

  it('recommends moderate tempo for energetic mood (grounding)', () => {
    const guidance = getMusicGuidanceForMood('energetic');
    expect(guidance.recommendedTempo).toBe('moderate');
    expect(guidance.recommendedValence).toBe('neutral');
  });

  it('recommends upbeat gentle music for happy mood', () => {
    const guidance = getMusicGuidanceForMood('happy');
    expect(guidance.recommendedTempo).toBe('moderate');
    expect(guidance.recommendedValence).toBe('high');
  });
});

describe('computeRegulationEffectiveness', () => {
  it('requires 2+ completed sessions per technique to report', () => {
    const sessions: RegulationSession[] = [
      makeSession({ id: 's1', effectiveness: 4 }),
    ];
    const result = computeRegulationEffectiveness(sessions);
    expect(result.length).toBe(0);
  });

  it('reports effectiveness when 2+ completed sessions exist', () => {
    const sessions: RegulationSession[] = [
      makeSession({ id: 's1', effectiveness: 4, completed: true }),
      makeSession({ id: 's2', effectiveness: 3, completed: true }),
    ];
    const result = computeRegulationEffectiveness(sessions);
    expect(result.length).toBe(1);
    expect(result[0].techniqueId).toBe('breathing_4_7_8');
    expect(result[0].avgEffectiveness).toBe(3.5);
    expect(result[0].timesUsed).toBe(2);
  });

  it('correctly splits with/without music effectiveness', () => {
    const sessions: RegulationSession[] = [
      makeSession({ id: 's1', effectiveness: 5, musicPlayed: true, completed: true }),
      makeSession({ id: 's2', effectiveness: 3, musicPlayed: false, completed: true }),
      makeSession({ id: 's3', effectiveness: 4, musicPlayed: true, completed: true }),
      makeSession({ id: 's4', effectiveness: 2, musicPlayed: false, completed: true }),
    ];
    const result = computeRegulationEffectiveness(sessions);
    expect(result.length).toBe(1);
    expect(result[0].withMusicAvg).toBe(4.5);
    expect(result[0].withoutMusicAvg).toBe(2.5);
  });

  it('calculates completion rate', () => {
    const sessions: RegulationSession[] = [
      makeSession({ id: 's1', effectiveness: 4, completed: true }),
      makeSession({ id: 's2', effectiveness: 3, completed: true }),
      makeSession({ id: 's3', completed: false }),
    ];
    const result = computeRegulationEffectiveness(sessions);
    expect(result.length).toBe(1);
    const rate = result[0].completionRate;
    expect(rate).toBeCloseTo(2 / 3, 2);
  });

  it('identifies best mood pairing', () => {
    const sessions: RegulationSession[] = [
      makeSession({ id: 's1', effectiveness: 5, moodBefore: makeMood('tense'), completed: true }),
      makeSession({ id: 's2', effectiveness: 4, moodBefore: makeMood('tense'), completed: true }),
      makeSession({ id: 's3', effectiveness: 2, moodBefore: makeMood('energetic'), completed: true }),
      makeSession({ id: 's4', effectiveness: 2, moodBefore: makeMood('energetic'), completed: true }),
    ];
    const result = computeRegulationEffectiveness(sessions);
    expect(result.length).toBe(1);
    expect(result[0].bestMoodPairing).toBe('tense');
  });

  it('skips sessions without effectiveness rating', () => {
    const sessions: RegulationSession[] = [
      makeSession({ id: 's1', effectiveness: 4, completed: true }),
      makeSession({ id: 's2', completed: true }), // no effectiveness
      makeSession({ id: 's3', effectiveness: 2, completed: true }),
    ];
    const result = computeRegulationEffectiveness(sessions);
    expect(result.length).toBe(1);
    expect(result[0].avgEffectiveness).toBe(3);
  });
});

describe('generateRegulationInsight', () => {
  it('mentions top technique by effectiveness', () => {
    const effectiveness: RegulationEffectiveness[] = [
      {
        techniqueId: 'breathing_4_7_8',
        techniqueName: '4-7-8 Breathing',
        timesUsed: 5,
        avgEffectiveness: 4.2,
        withMusicAvg: 4.5,
        withoutMusicAvg: 3.8,
        bestMoodPairing: 'tense',
        completionRate: 0.9,
      },
      {
        techniqueId: 'thought_record',
        techniqueName: 'Thought Record',
        timesUsed: 3,
        avgEffectiveness: 3.0,
        withMusicAvg: 3.0,
        withoutMusicAvg: 3.0,
        bestMoodPairing: 'melancholic',
        completionRate: 0.7,
      },
    ];
    const insight = generateRegulationInsight(effectiveness);
    expect(insight).toContain('4-7-8 Breathing');
    expect(insight).toContain('4.2');
  });

  it('mentions music impact when significant difference', () => {
    const effectiveness: RegulationEffectiveness[] = [
      {
        techniqueId: 'body_scan',
        techniqueName: 'Body Scan Meditation',
        timesUsed: 6,
        avgEffectiveness: 3.5,
        withMusicAvg: 4.5,
        withoutMusicAvg: 2.5,
        bestMoodPairing: 'tense',
        completionRate: 0.8,
      },
    ];
    const insight = generateRegulationInsight(effectiveness);
    expect(insight.toLowerCase()).toContain('music');
  });

  it('returns empty string for empty input', () => {
    const insight = generateRegulationInsight([]);
    expect(insight).toBe('');
  });
});
