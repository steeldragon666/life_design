export interface SpotifyAudioFeatures {
  valence: number;       // 0-1 (musical positivity)
  energy: number;        // 0-1 (intensity)
  danceability: number;  // 0-1 (how danceable)
  tempo: number;         // BPM
  acousticness: number;  // 0-1
  instrumentalness: number; // 0-1
}

export interface MoodClassification {
  primaryMood: 'energetic' | 'happy' | 'calm' | 'melancholic' | 'tense';
  valenceScore: number;   // 0-1
  energyScore: number;    // 0-1
  confidence: number;     // 0-1
}

/**
 * Classify mood from Spotify audio features using Russell's Circumplex Model.
 *
 * Valence (x-axis): negative <-> positive emotion
 * Energy (y-axis): low <-> high arousal
 *
 * Quadrants:
 *   High valence + High energy = energetic/happy
 *   High valence + Low energy = calm/content
 *   Low valence + High energy = tense/angry
 *   Low valence + Low energy = melancholic/sad
 */
export function classifyMoodFromAudioFeatures(features: SpotifyAudioFeatures): MoodClassification {
  const { valence, energy } = features;

  // Determine quadrant
  const highValence = valence >= 0.5;
  const highEnergy = energy >= 0.5;

  let primaryMood: MoodClassification['primaryMood'];

  if (highValence && highEnergy) {
    primaryMood = valence >= 0.7 && energy >= 0.7 ? 'energetic' : 'happy';
  } else if (highValence && !highEnergy) {
    primaryMood = 'calm';
  } else if (!highValence && highEnergy) {
    primaryMood = 'tense';
  } else {
    primaryMood = 'melancholic';
  }

  // Confidence based on distance from center (0.5, 0.5)
  const dx = valence - 0.5;
  const dy = energy - 0.5;
  const confidence = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);

  return {
    primaryMood,
    valenceScore: valence,
    energyScore: energy,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Aggregate mood from multiple tracks (e.g., recently played).
 */
export function aggregateTrackMoods(tracks: SpotifyAudioFeatures[]): MoodClassification | null {
  if (tracks.length === 0) return null;

  const avgFeatures: SpotifyAudioFeatures = {
    valence: tracks.reduce((s, t) => s + t.valence, 0) / tracks.length,
    energy: tracks.reduce((s, t) => s + t.energy, 0) / tracks.length,
    danceability: tracks.reduce((s, t) => s + t.danceability, 0) / tracks.length,
    tempo: tracks.reduce((s, t) => s + t.tempo, 0) / tracks.length,
    acousticness: tracks.reduce((s, t) => s + t.acousticness, 0) / tracks.length,
    instrumentalness: tracks.reduce((s, t) => s + t.instrumentalness, 0) / tracks.length,
  };

  return classifyMoodFromAudioFeatures(avgFeatures);
}
