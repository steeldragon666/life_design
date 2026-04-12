import { describe, it, expect } from 'vitest';
import {
  classifyMoodFromAudioFeatures,
  aggregateTrackMoods,
  analyzeListeningPattern,
  suggestMoodFromListening,
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

describe('analyzeListeningPattern', () => {
  it('returns null for fewer than 3 tracks', () => {
    expect(analyzeListeningPattern([])).toBeNull();
    expect(analyzeListeningPattern([features({})])).toBeNull();
    expect(analyzeListeningPattern([features({}), features({})])).toBeNull();
  });

  it('detects stable mood shift when valence is consistent', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 120 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.moodShift).toBe('stable');
  });

  it('detects improving mood shift when valence increases by > 0.15', () => {
    const tracks = [
      features({ valence: 0.2, energy: 0.5, tempo: 120 }),
      features({ valence: 0.4, energy: 0.5, tempo: 120 }),
      features({ valence: 0.6, energy: 0.5, tempo: 120 }),
      features({ valence: 0.7, energy: 0.5, tempo: 120 }),
      features({ valence: 0.8, energy: 0.5, tempo: 120 }),
      features({ valence: 0.9, energy: 0.5, tempo: 120 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.moodShift).toBe('improving');
  });

  it('detects declining mood shift when valence decreases by > 0.15', () => {
    const tracks = [
      features({ valence: 0.9, energy: 0.5, tempo: 120 }),
      features({ valence: 0.8, energy: 0.5, tempo: 120 }),
      features({ valence: 0.7, energy: 0.5, tempo: 120 }),
      features({ valence: 0.4, energy: 0.5, tempo: 120 }),
      features({ valence: 0.3, energy: 0.5, tempo: 120 }),
      features({ valence: 0.2, energy: 0.5, tempo: 120 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.moodShift).toBe('declining');
  });

  it('detects volatile mood shift when valence standard deviation > 0.2', () => {
    const tracks = [
      features({ valence: 0.1, energy: 0.5, tempo: 120 }),
      features({ valence: 0.9, energy: 0.5, tempo: 120 }),
      features({ valence: 0.1, energy: 0.5, tempo: 120 }),
      features({ valence: 0.9, energy: 0.5, tempo: 120 }),
      features({ valence: 0.1, energy: 0.5, tempo: 120 }),
      features({ valence: 0.9, energy: 0.5, tempo: 120 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.moodShift).toBe('volatile');
  });

  it('detects increasing tempo trend', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 80 }),
      features({ valence: 0.5, energy: 0.5, tempo: 85 }),
      features({ valence: 0.5, energy: 0.5, tempo: 90 }),
      features({ valence: 0.5, energy: 0.5, tempo: 110 }),
      features({ valence: 0.5, energy: 0.5, tempo: 115 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.tempoTrend).toBe('increasing');
  });

  it('detects decreasing tempo trend', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 140 }),
      features({ valence: 0.5, energy: 0.5, tempo: 135 }),
      features({ valence: 0.5, energy: 0.5, tempo: 130 }),
      features({ valence: 0.5, energy: 0.5, tempo: 100 }),
      features({ valence: 0.5, energy: 0.5, tempo: 95 }),
      features({ valence: 0.5, energy: 0.5, tempo: 90 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.tempoTrend).toBe('decreasing');
  });

  it('detects stable tempo trend when difference is small', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 120 }),
      features({ valence: 0.5, energy: 0.5, tempo: 122 }),
      features({ valence: 0.5, energy: 0.5, tempo: 118 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.tempoTrend).toBe('stable');
  });

  it('detects genre shift when acousticness changes significantly', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.1, instrumentalness: 0.1 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.15, instrumentalness: 0.1 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.2, instrumentalness: 0.1 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.6, instrumentalness: 0.1 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.7, instrumentalness: 0.1 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.8, instrumentalness: 0.1 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.genreShift).toBe(true);
  });

  it('detects genre shift when instrumentalness changes significantly', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.1 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.15 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.2 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.6 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.7 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.8 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.genreShift).toBe(true);
  });

  it('returns no genre shift when acousticness/instrumentalness are stable', () => {
    const tracks = [
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.5 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.5 }),
      features({ valence: 0.5, energy: 0.5, tempo: 120, acousticness: 0.5, instrumentalness: 0.5 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.genreShift).toBe(false);
  });

  it('detects emotional regulation signal (melancholic start to happy end)', () => {
    const tracks = [
      features({ valence: 0.2, energy: 0.2, tempo: 120 }), // melancholic
      features({ valence: 0.4, energy: 0.4, tempo: 120 }),
      features({ valence: 0.7, energy: 0.6, tempo: 120 }), // happy
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.emotionalRegulationSignal).toBe(true);
  });

  it('detects emotional regulation signal (tense start to calm end)', () => {
    const tracks = [
      features({ valence: 0.3, energy: 0.8, tempo: 120 }), // tense
      features({ valence: 0.5, energy: 0.5, tempo: 120 }),
      features({ valence: 0.7, energy: 0.3, tempo: 120 }), // calm
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.emotionalRegulationSignal).toBe(true);
  });

  it('returns no emotional regulation signal when start is already happy', () => {
    const tracks = [
      features({ valence: 0.8, energy: 0.8, tempo: 120 }), // energetic
      features({ valence: 0.7, energy: 0.7, tempo: 120 }),
      features({ valence: 0.6, energy: 0.6, tempo: 120 }), // happy
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.emotionalRegulationSignal).toBe(false);
  });

  it('computes dominant mood correctly', () => {
    // Most tracks are happy
    const tracks = [
      features({ valence: 0.6, energy: 0.6 }), // happy
      features({ valence: 0.7, energy: 0.6 }), // happy
      features({ valence: 0.2, energy: 0.2 }), // melancholic
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.dominantMood).toBe('happy');
  });

  it('provides session moods for each track', () => {
    const tracks = [
      features({ valence: 0.8, energy: 0.9 }),
      features({ valence: 0.2, energy: 0.2 }),
      features({ valence: 0.7, energy: 0.3 }),
    ];
    const result = analyzeListeningPattern(tracks)!;
    expect(result.sessionMoods).toHaveLength(3);
    expect(result.sessionMoods[0].primaryMood).toBe('energetic');
    expect(result.sessionMoods[1].primaryMood).toBe('melancholic');
    expect(result.sessionMoods[2].primaryMood).toBe('calm');
  });
});

describe('suggestMoodFromListening', () => {
  it('returns null for fewer than 3 tracks', () => {
    expect(suggestMoodFromListening([])).toBeNull();
    expect(suggestMoodFromListening([features({})])).toBeNull();
    expect(suggestMoodFromListening([features({}), features({})])).toBeNull();
  });

  it('maps very low valence (< 0.2) to mood 1', () => {
    const tracks = [
      features({ valence: 0.1, energy: 0.8 }),
      features({ valence: 0.15, energy: 0.8 }),
      features({ valence: 0.1, energy: 0.8 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result).not.toBeNull();
    expect(result.suggestedMood).toBe(1);
    expect(result.source).toBe('spotify_listening');
  });

  it('maps low valence (0.2-0.4) to mood 2', () => {
    const tracks = [
      features({ valence: 0.3, energy: 0.5 }),
      features({ valence: 0.3, energy: 0.5 }),
      features({ valence: 0.3, energy: 0.5 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result.suggestedMood).toBe(2);
  });

  it('maps mid valence (0.4-0.6) to mood 3', () => {
    // Use valence in 0.4-0.6 range but with energy far from 0.5 to ensure confidence > 0.3
    const tracks = [
      features({ valence: 0.5, energy: 0.1 }),
      features({ valence: 0.5, energy: 0.1 }),
      features({ valence: 0.5, energy: 0.1 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result.suggestedMood).toBe(3);
  });

  it('maps high valence (0.6-0.8) to mood 4', () => {
    const tracks = [
      features({ valence: 0.7, energy: 0.7 }),
      features({ valence: 0.7, energy: 0.7 }),
      features({ valence: 0.7, energy: 0.7 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result.suggestedMood).toBe(4);
  });

  it('maps very high valence (>= 0.8) to mood 5', () => {
    const tracks = [
      features({ valence: 0.9, energy: 0.9 }),
      features({ valence: 0.85, energy: 0.9 }),
      features({ valence: 0.9, energy: 0.9 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result.suggestedMood).toBe(5);
  });

  it('returns null when confidence is below 0.3', () => {
    // Valence and energy near center (0.5, 0.5) -> low confidence
    const tracks = [
      features({ valence: 0.5, energy: 0.5 }),
      features({ valence: 0.5, energy: 0.5 }),
      features({ valence: 0.5, energy: 0.5 }),
    ];
    const result = suggestMoodFromListening(tracks);
    expect(result).toBeNull();
  });

  it('includes confidence value from aggregate mood', () => {
    const tracks = [
      features({ valence: 0.9, energy: 0.9 }),
      features({ valence: 0.85, energy: 0.85 }),
      features({ valence: 0.9, energy: 0.9 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result.confidence).toBeGreaterThanOrEqual(0.3);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('includes reasoning text', () => {
    const tracks = [
      features({ valence: 0.9, energy: 0.9 }),
      features({ valence: 0.85, energy: 0.85 }),
      features({ valence: 0.9, energy: 0.9 }),
    ];
    const result = suggestMoodFromListening(tracks)!;
    expect(result.reasoning).toBeTruthy();
    expect(typeof result.reasoning).toBe('string');
  });
});
