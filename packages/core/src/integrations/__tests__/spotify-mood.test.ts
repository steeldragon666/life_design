import { describe, it, expect } from 'vitest';
import {
  classifyMoodFromAudioFeatures,
  aggregateTrackMoods,
  type SpotifyAudioFeatures,
} from '../spotify-mood';

const baseFeatures: SpotifyAudioFeatures = {
  valence: 0.5,
  energy: 0.5,
  danceability: 0.5,
  tempo: 120,
  acousticness: 0.5,
  instrumentalness: 0.5,
};

function features(overrides: Partial<SpotifyAudioFeatures>): SpotifyAudioFeatures {
  return { ...baseFeatures, ...overrides };
}

describe('classifyMoodFromAudioFeatures', () => {
  it('returns energetic for high valence + very high energy (both >= 0.7)', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.8, energy: 0.9 }));
    expect(result.primaryMood).toBe('energetic');
  });

  it('returns happy for high valence + high energy (not both >= 0.7)', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.6, energy: 0.6 }));
    expect(result.primaryMood).toBe('happy');
  });

  it('returns calm for high valence + low energy', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.7, energy: 0.3 }));
    expect(result.primaryMood).toBe('calm');
  });

  it('returns tense for low valence + high energy', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.3, energy: 0.7 }));
    expect(result.primaryMood).toBe('tense');
  });

  it('returns melancholic for low valence + low energy', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.2, energy: 0.2 }));
    expect(result.primaryMood).toBe('melancholic');
  });

  it('returns happy at boundary (valence=0.5, energy=0.5)', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.5, energy: 0.5 }));
    expect(result.primaryMood).toBe('happy');
  });

  it('returns low confidence near center (0.5, 0.5)', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.5, energy: 0.5 }));
    expect(result.confidence).toBeCloseTo(0, 1);
  });

  it('returns high confidence at extremes (1.0, 1.0)', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 1.0, energy: 1.0 }));
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('passes through valence and energy scores', () => {
    const result = classifyMoodFromAudioFeatures(features({ valence: 0.3, energy: 0.8 }));
    expect(result.valenceScore).toBe(0.3);
    expect(result.energyScore).toBe(0.8);
  });
});

describe('aggregateTrackMoods', () => {
  it('returns null for empty array', () => {
    expect(aggregateTrackMoods([])).toBeNull();
  });

  it('averages features and classifies correctly', () => {
    const tracks: SpotifyAudioFeatures[] = [
      features({ valence: 0.8, energy: 0.8 }),
      features({ valence: 0.6, energy: 0.6 }),
    ];
    const result = aggregateTrackMoods(tracks);
    expect(result).not.toBeNull();
    // Average: valence=0.7, energy=0.7 -> energetic
    expect(result!.primaryMood).toBe('energetic');
    expect(result!.valenceScore).toBe(0.7);
    expect(result!.energyScore).toBe(0.7);
  });

  it('handles a single track', () => {
    const tracks = [features({ valence: 0.2, energy: 0.1 })];
    const result = aggregateTrackMoods(tracks);
    expect(result).not.toBeNull();
    expect(result!.primaryMood).toBe('melancholic');
  });
});
