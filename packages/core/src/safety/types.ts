export enum CrisisLevel {
  None = 'none',
  Low = 'low',       // Distress but not imminent risk
  Medium = 'medium', // Hopelessness, passive ideation
  High = 'high',     // Active ideation, self-harm, explicit intent
}

export interface CrisisDetectionResult {
  matched: boolean;
  level: CrisisLevel;
  triggers: string[];
  confidence: number;
}

export interface CrisisResponse {
  message: string;
  resources: CrisisResource[];
  level: CrisisLevel;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
  url?: string;
}
