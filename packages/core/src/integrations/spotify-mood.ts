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

export interface ListeningPattern {
  sessionMoods: MoodClassification[];
  moodShift: 'stable' | 'improving' | 'declining' | 'volatile';
  dominantMood: MoodClassification['primaryMood'];
  tempoTrend: 'increasing' | 'stable' | 'decreasing';
  genreShift: boolean;
  emotionalRegulationSignal: boolean;
}

export interface MoodPreFillSuggestion {
  suggestedMood: number;
  confidence: number;
  source: 'spotify_listening';
  reasoning: string;
}

function average(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function stddev(nums: number[]): number {
  const avg = average(nums);
  const squareDiffs = nums.map((n) => (n - avg) ** 2);
  return Math.sqrt(average(squareDiffs));
}

function splitThirds<T>(arr: T[]): { first: T[]; last: T[] } {
  const thirdLen = Math.max(1, Math.floor(arr.length / 3));
  return {
    first: arr.slice(0, thirdLen),
    last: arr.slice(arr.length - thirdLen),
  };
}

/**
 * Analyze a listening session to detect mood patterns, tempo trends,
 * genre shifts, and emotional regulation signals.
 */
export function analyzeListeningPattern(tracks: SpotifyAudioFeatures[]): ListeningPattern | null {
  if (tracks.length < 3) return null;

  const sessionMoods = tracks.map(classifyMoodFromAudioFeatures);

  // Mood shift
  const valences = tracks.map((t) => t.valence);
  const { first: firstValences, last: lastValences } = splitThirds(valences);
  const firstAvgValence = average(firstValences);
  const lastAvgValence = average(lastValences);
  const valenceDelta = lastAvgValence - firstAvgValence;
  const valenceStdDev = stddev(valences);

  let moodShift: ListeningPattern['moodShift'];
  if (valenceDelta > 0.15) {
    moodShift = 'improving';
  } else if (valenceDelta < -0.15) {
    moodShift = 'declining';
  } else if (valenceStdDev > 0.2) {
    moodShift = 'volatile';
  } else {
    moodShift = 'stable';
  }

  // Tempo trend
  const tempos = tracks.map((t) => t.tempo);
  const { first: firstTempos, last: lastTempos } = splitThirds(tempos);
  const tempoDelta = average(lastTempos) - average(firstTempos);
  let tempoTrend: ListeningPattern['tempoTrend'];
  if (tempoDelta > 15) {
    tempoTrend = 'increasing';
  } else if (tempoDelta < -15) {
    tempoTrend = 'decreasing';
  } else {
    tempoTrend = 'stable';
  }

  // Genre shift: acousticness or instrumentalness changed significantly
  const acousticnesses = tracks.map((t) => t.acousticness);
  const instrumentalnesses = tracks.map((t) => t.instrumentalness);
  const { first: firstAcoustic, last: lastAcoustic } = splitThirds(acousticnesses);
  const { first: firstInstr, last: lastInstr } = splitThirds(instrumentalnesses);
  const acousticDelta = Math.abs(average(lastAcoustic) - average(firstAcoustic));
  const instrDelta = Math.abs(average(lastInstr) - average(firstInstr));
  const genreShift = acousticDelta > 0.3 || instrDelta > 0.3;

  // Emotional regulation signal: first track melancholic/tense AND last track calm/happy
  const firstMood = sessionMoods[0].primaryMood;
  const lastMood = sessionMoods[sessionMoods.length - 1].primaryMood;
  const negativeStarts: MoodClassification['primaryMood'][] = ['melancholic', 'tense'];
  const positiveEnds: MoodClassification['primaryMood'][] = ['calm', 'happy'];
  const emotionalRegulationSignal =
    negativeStarts.includes(firstMood) && positiveEnds.includes(lastMood);

  // Dominant mood: most frequent primary mood
  const moodCounts = new Map<MoodClassification['primaryMood'], number>();
  for (const m of sessionMoods) {
    moodCounts.set(m.primaryMood, (moodCounts.get(m.primaryMood) ?? 0) + 1);
  }
  let dominantMood = sessionMoods[0].primaryMood;
  let maxCount = 0;
  for (const [mood, count] of moodCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }

  return {
    sessionMoods,
    moodShift,
    dominantMood,
    tempoTrend,
    genreShift,
    emotionalRegulationSignal,
  };
}

/**
 * Suggest a mood pre-fill value (1-5) based on recent Spotify listening.
 */
export function suggestMoodFromListening(tracks: SpotifyAudioFeatures[]): MoodPreFillSuggestion | null {
  if (tracks.length < 3) return null;

  const aggregate = aggregateTrackMoods(tracks);
  if (!aggregate) return null;

  const { valenceScore, confidence } = aggregate;
  if (confidence < 0.3) return null;

  let suggestedMood: number;
  if (valenceScore < 0.2) {
    suggestedMood = 1;
  } else if (valenceScore < 0.4) {
    suggestedMood = 2;
  } else if (valenceScore < 0.6) {
    suggestedMood = 3;
  } else if (valenceScore < 0.8) {
    suggestedMood = 4;
  } else {
    suggestedMood = 5;
  }

  const pattern = analyzeListeningPattern(tracks);
  const moodLabel = aggregate.primaryMood;
  const shiftNote = pattern ? ` with ${pattern.moodShift} mood trajectory` : '';
  const reasoning = `Recent listening suggests ${moodLabel} mood${shiftNote}`;

  return {
    suggestedMood,
    confidence,
    source: 'spotify_listening',
    reasoning,
  };
}
