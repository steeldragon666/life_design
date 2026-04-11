// packages/core/src/profiling/psychometric-types.ts

/** PERMA Profiler scores (Butler & Kern, 2016) — 0-10 scale per subscale */
export interface PERMAScores {
  positiveEmotion: number;  // 0-10 scale
  engagement: number;
  relationships: number;
  meaning: number;
  accomplishment: number;
  overall: number;          // average of all 5 subscales
}

/** Ten-Item Personality Inventory scores (Gosling et al., 2003) — 1-7 scale */
export interface TIPIScores {
  extraversion: number;
  agreeableness: number;
  conscientiousness: number;
  emotionalStability: number;
  openness: number;
}

/** Short Grit Scale scores (Duckworth & Quinn, 2009) — 1-5 scale */
export interface GritScores {
  perseverance: number;    // items 2,4,6,8
  consistency: number;     // items 1,3,5,7 (all reversed)
  overall: number;         // average of all 8 items
}

/** Satisfaction with Life Scale score (Diener et al., 1985) — raw 5-35, normalised 1-7 */
export interface SWLSScore {
  score: number;           // normalised 1-7 scale
  band:
    | 'extremely_dissatisfied'
    | 'dissatisfied'
    | 'slightly_dissatisfied'
    | 'neutral'
    | 'slightly_satisfied'
    | 'satisfied'
    | 'extremely_satisfied';
}

/** Basic Psychological Needs Scale scores (Deci & Ryan) — 1-7 scale */
export interface BPNSScores {
  autonomy: number;        // 1-7 scale
  competence: number;
  relatedness: number;
}

/** Composite psychometric profile combining all five validated instruments */
export interface PsychometricProfile {
  perma: PERMAScores;
  tipi: TIPIScores;
  grit: GritScores;
  swls: SWLSScore;
  bpns: BPNSScores;
}

/** MEQ-SA Chronotype (Horne & Ostberg) — categorical result */
export interface ChronotypeScore {
  type: 'definite_morning' | 'moderate_morning' | 'intermediate' | 'moderate_evening' | 'definite_evening';
  raw: number;
}

/** PSQI Short Form — Sleep Quality (0-3 scale per item) */
export interface SleepQualityScore {
  score: number;
  quality: 'good' | 'fair' | 'poor';
}

/** PSS-4 Perceived Stress (Cohen) — 0-4 scale per item */
export interface StressScore {
  score: number;
  level: 'low' | 'moderate' | 'high';
}

/** SCS-SF Self-Compassion (Neff) — 1-5 scale per item */
export interface SelfCompassionScore {
  score: number;
  level: 'low' | 'moderate' | 'high';
}

/** Brief IPC Locus of Control (Levenson) — 1-6 scale per item */
export interface LocusOfControlScore {
  internal: number;
  powerfulOthers: number;
  chance: number;
  dominant: 'internal' | 'powerful_others' | 'chance';
}

/** Extended psychometric profile including baseline instruments */
export interface ExtendedPsychometricProfile extends PsychometricProfile {
  chronotype: ChronotypeScore;
  sleepQuality: SleepQualityScore;
  stress: StressScore;
  selfCompassion: SelfCompassionScore;
  locusOfControl: LocusOfControlScore;
}

/** Item definition for validated psychometric instruments */
export interface PsychometricItem {
  id: string;
  instrument: 'perma' | 'tipi' | 'grit' | 'swls' | 'bpns' | 'chronotype' | 'sleep' | 'stress' | 'selfCompassion' | 'locusOfControl';
  subscale: string;
  text: string;
  reversed: boolean;
  scaleMin: number;
  scaleMax: number;
}
