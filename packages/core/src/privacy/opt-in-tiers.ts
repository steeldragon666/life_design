export enum OptInTier {
  Basic = 'basic',       // Mood + journal only
  Enhanced = 'enhanced', // + health sensors + integrations
  Full = 'full',         // + behavioural + financial + federated
}

export interface TierBenefit {
  tier: OptInTier;
  shares: string[];
  gets: string[];
}

export const TIER_BENEFITS: TierBenefit[] = [
  {
    tier: OptInTier.Basic,
    shares: ['Daily mood check-ins', 'Journal entries'],
    gets: ['Mood trends', 'Basic insights', 'AI mentor conversations'],
  },
  {
    tier: OptInTier.Enhanced,
    shares: ['Health data (sleep, HRV, steps)', 'Calendar events', 'Music listening', 'Exercise data'],
    gets: [
      'Sleep quality analysis',
      'Exercise-mood correlations',
      'Social isolation detection',
      'Weather-mood patterns',
      'Personalised intervention timing (JITAI)',
    ],
  },
  {
    tier: OptInTier.Full,
    shares: ['Screen time patterns', 'Financial transaction patterns', 'Federated model contributions'],
    gets: [
      'N-of-1 personalised predictions',
      'Financial stress detection',
      'Digital wellness insights',
      'Population-level research contributions',
      'Clinical data export for therapists',
    ],
  },
];

const TIER_ORDER: Record<OptInTier, number> = {
  [OptInTier.Basic]: 0,
  [OptInTier.Enhanced]: 1,
  [OptInTier.Full]: 2,
};

export function isFeatureAvailable(userTier: OptInTier, requiredTier: OptInTier): boolean {
  return TIER_ORDER[userTier] >= TIER_ORDER[requiredTier];
}
