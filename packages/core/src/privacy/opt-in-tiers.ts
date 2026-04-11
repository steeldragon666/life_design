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

export function isFeatureAvailable(userTier: OptInTier, requiredTier: OptInTier): boolean {
  const tierOrder = [OptInTier.Basic, OptInTier.Enhanced, OptInTier.Full];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
}
