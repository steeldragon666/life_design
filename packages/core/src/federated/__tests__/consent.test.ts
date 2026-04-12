import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createConsent,
  grantConsent,
  withdrawConsent,
  canParticipateInRound,
  getConsentSummary,
} from '../consent';

describe('Federated Consent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('createConsent starts opted out', () => {
    const consent = createConsent('user-1');
    expect(consent.userId).toBe('user-1');
    expect(consent.optedIn).toBe(false);
    expect(consent.consentedAt).toBeNull();
    expect(consent.withdrawnAt).toBeNull();
    expect(consent.dataSharedRounds).toBe(0);
  });

  it('grantConsent sets optedIn and consentedAt', () => {
    const consent = createConsent('user-1');
    const granted = grantConsent(consent);
    expect(granted.optedIn).toBe(true);
    expect(granted.consentedAt).toBe('2026-03-15T10:00:00.000Z');
  });

  it('withdrawConsent sets optedIn false and withdrawnAt', () => {
    let consent = createConsent('user-1');
    consent = grantConsent(consent);

    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'));
    const withdrawn = withdrawConsent(consent);

    expect(withdrawn.optedIn).toBe(false);
    expect(withdrawn.withdrawnAt).toBe('2026-03-20T12:00:00.000Z');
  });

  it('withdrawConsent preserves dataSharedRounds', () => {
    let consent = createConsent('user-1');
    consent = grantConsent(consent);
    consent = { ...consent, dataSharedRounds: 5 };

    const withdrawn = withdrawConsent(consent);
    expect(withdrawn.dataSharedRounds).toBe(5);
  });

  it('canParticipateInRound true when opted in', () => {
    let consent = createConsent('user-1');
    consent = grantConsent(consent);
    expect(canParticipateInRound(consent)).toBe(true);
  });

  it('canParticipateInRound false when opted out', () => {
    const consent = createConsent('user-1');
    expect(canParticipateInRound(consent)).toBe(false);
  });

  it('getConsentSummary includes opt-in date when opted in', () => {
    let consent = createConsent('user-1');
    consent = grantConsent(consent);
    consent = { ...consent, dataSharedRounds: 3 };

    const summary = getConsentSummary(consent);
    expect(summary).toContain('Opted in to federated learning');
    expect(summary).toContain('3 round(s) participated');
    // The date should be present (locale-dependent, so just check for "since")
    expect(summary).toContain('since');
  });

  it('getConsentSummary mentions withdrawal when opted out', () => {
    let consent = createConsent('user-1');
    consent = grantConsent(consent);
    consent = { ...consent, dataSharedRounds: 2 };

    vi.setSystemTime(new Date('2026-04-01T08:00:00Z'));
    consent = withdrawConsent(consent);

    const summary = getConsentSummary(consent);
    expect(summary).toContain('Withdrawn from federated learning');
    expect(summary).toContain('2 round(s) were shared before withdrawal');
  });
});
