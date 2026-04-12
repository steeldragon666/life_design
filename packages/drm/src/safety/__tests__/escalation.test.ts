import { buildCrisisProtocol, ALL_CRISIS_RESOURCES } from '../escalation.js';
import { SafetyTier } from '../../types.js';

describe('buildCrisisProtocol', () => {
  describe('Tier 1 (Immediate)', () => {
    it('returns a non-null systemPromptOverride string', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier1_Immediate, null);
      expect(protocol.systemPromptOverride).not.toBeNull();
      expect(typeof protocol.systemPromptOverride).toBe('string');
      expect(protocol.systemPromptOverride!.length).toBeGreaterThan(0);
    });

    it('returns a non-empty crisisResources array', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier1_Immediate, null);
      expect(Array.isArray(protocol.crisisResources)).toBe(true);
      expect(protocol.crisisResources.length).toBeGreaterThan(0);
    });

    it('enables guardian notification', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier1_Immediate, null);
      expect(protocol.shouldNotifyGuardian).toBe(true);
    });

    it('enables event logging', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier1_Immediate, null);
      expect(protocol.shouldLogEvent).toBe(true);
    });

    it('passes the signal parameter without throwing', () => {
      expect(() =>
        buildCrisisProtocol(SafetyTier.Tier1_Immediate, 'suicidal ideation detected'),
      ).not.toThrow();
    });
  });

  describe('Tier 2 (Elevated)', () => {
    it('returns a non-null systemPromptOverride (injection, not full override)', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier2_Elevated, null);
      expect(protocol.systemPromptOverride).not.toBeNull();
    });

    it('does not include crisis resources', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier2_Elevated, null);
      expect(protocol.crisisResources).toHaveLength(0);
    });

    it('does not notify guardian', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier2_Elevated, null);
      expect(protocol.shouldNotifyGuardian).toBe(false);
    });

    it('enables event logging for audit trail', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier2_Elevated, null);
      expect(protocol.shouldLogEvent).toBe(true);
    });
  });

  describe('Tier 3 (No Risk)', () => {
    it('returns null systemPromptOverride', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier3_NoRisk, null);
      expect(protocol.systemPromptOverride).toBeNull();
    });

    it('returns empty crisisResources', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier3_NoRisk, null);
      expect(protocol.crisisResources).toHaveLength(0);
    });

    it('does not notify guardian', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier3_NoRisk, null);
      expect(protocol.shouldNotifyGuardian).toBe(false);
    });

    it('does not log events', () => {
      const protocol = buildCrisisProtocol(SafetyTier.Tier3_NoRisk, null);
      expect(protocol.shouldLogEvent).toBe(false);
    });
  });
});

describe('ALL_CRISIS_RESOURCES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(ALL_CRISIS_RESOURCES)).toBe(true);
    expect(ALL_CRISIS_RESOURCES.length).toBeGreaterThan(0);
  });

  it('includes Lifeline (Australian helpline)', () => {
    const lifeline = ALL_CRISIS_RESOURCES.find((r) => r.name === 'Lifeline');
    expect(lifeline).toBeDefined();
    expect(lifeline?.country).toBe('AU');
    expect(lifeline?.number).toBeTruthy();
  });

  it('includes Beyond Blue (Australian helpline)', () => {
    const beyondBlue = ALL_CRISIS_RESOURCES.find((r) => r.name === 'Beyond Blue');
    expect(beyondBlue).toBeDefined();
    expect(beyondBlue?.country).toBe('AU');
    expect(beyondBlue?.number).toBeTruthy();
  });

  it('includes resources from multiple countries', () => {
    const countries = new Set(ALL_CRISIS_RESOURCES.map((r) => r.country));
    expect(countries.size).toBeGreaterThan(1);
  });

  it('every resource has required fields', () => {
    for (const resource of ALL_CRISIS_RESOURCES) {
      expect(typeof resource.name).toBe('string');
      expect(resource.name.length).toBeGreaterThan(0);
      expect(typeof resource.number).toBe('string');
      expect(resource.number.length).toBeGreaterThan(0);
      expect(['AU', 'US', 'UK']).toContain(resource.country);
      expect(typeof resource.description).toBe('string');
    }
  });

  it('lists AU resources first (primary market)', () => {
    const firstResource = ALL_CRISIS_RESOURCES[0];
    expect(firstResource?.country).toBe('AU');
  });
});
