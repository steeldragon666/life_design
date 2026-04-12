export interface FederatedConsent {
  userId: string;
  optedIn: boolean;
  consentedAt: string | null;
  withdrawnAt: string | null;
  dataSharedRounds: number;
}

/**
 * Create a new consent record for a user.
 * Initial state is opted out.
 */
export function createConsent(userId: string): FederatedConsent {
  return {
    userId,
    optedIn: false,
    consentedAt: null,
    withdrawnAt: null,
    dataSharedRounds: 0,
  };
}

/**
 * Grant consent for federated learning participation.
 * Sets optedIn to true and records the current timestamp.
 */
export function grantConsent(consent: FederatedConsent): FederatedConsent {
  return {
    ...consent,
    optedIn: true,
    consentedAt: new Date().toISOString(),
  };
}

/**
 * Withdraw consent for federated learning participation.
 * Sets optedIn to false and records the withdrawal timestamp.
 * Preserves the number of rounds already participated in.
 */
export function withdrawConsent(consent: FederatedConsent): FederatedConsent {
  return {
    ...consent,
    optedIn: false,
    withdrawnAt: new Date().toISOString(),
  };
}

/**
 * Check whether the user can participate in a federated learning round.
 * Only returns true if the user has actively opted in.
 */
export function canParticipateInRound(consent: FederatedConsent): boolean {
  return consent.optedIn === true;
}

/**
 * Generate a human-readable summary of the user's consent status.
 */
export function getConsentSummary(consent: FederatedConsent): string {
  if (consent.optedIn) {
    const since = consent.consentedAt
      ? ` since ${new Date(consent.consentedAt).toLocaleDateString()}`
      : '';
    return `Opted in to federated learning${since}. ${consent.dataSharedRounds} round(s) participated.`;
  }

  if (consent.withdrawnAt) {
    return `Withdrawn from federated learning on ${new Date(consent.withdrawnAt).toLocaleDateString()}. ${consent.dataSharedRounds} round(s) were shared before withdrawal.`;
  }

  return 'Not yet opted in to federated learning.';
}
