import {
  createDefaultCommunicationDNA,
  adaptCommunicationDNA,
} from '../communication-dna.js';
import { EmotionalRegister } from '../../types.js';

describe('createDefaultCommunicationDNA', () => {
  it('returns an object with all required fields', () => {
    const dna = createDefaultCommunicationDNA();
    expect(dna.emotionalRegister).toBeDefined();
    expect(dna.metaphorUsage).toBeDefined();
    expect(typeof dna.directnessLevel).toBe('number');
    expect(typeof dna.humourLevel).toBe('number');
    expect(typeof dna.challengeLevel).toBe('number');
    expect(dna.pacing).toBeDefined();
    expect(dna.languageComplexity).toBeDefined();
  });

  it('directnessLevel is in [0, 1]', () => {
    const dna = createDefaultCommunicationDNA();
    expect(dna.directnessLevel).toBeGreaterThanOrEqual(0);
    expect(dna.directnessLevel).toBeLessThanOrEqual(1);
  });

  it('humourLevel is in [0, 1]', () => {
    const dna = createDefaultCommunicationDNA();
    expect(dna.humourLevel).toBeGreaterThanOrEqual(0);
    expect(dna.humourLevel).toBeLessThanOrEqual(1);
  });

  it('challengeLevel is in [0, 1]', () => {
    const dna = createDefaultCommunicationDNA();
    expect(dna.challengeLevel).toBeGreaterThanOrEqual(0);
    expect(dna.challengeLevel).toBeLessThanOrEqual(1);
  });

  it('metaphorUsage is one of the valid values', () => {
    const dna = createDefaultCommunicationDNA();
    expect(['high', 'moderate', 'low']).toContain(dna.metaphorUsage);
  });

  it('pacing is one of the valid values', () => {
    const dna = createDefaultCommunicationDNA();
    expect(['brief', 'moderate', 'expansive']).toContain(dna.pacing);
  });

  it('languageComplexity is one of the valid values', () => {
    const dna = createDefaultCommunicationDNA();
    expect(['simple', 'moderate', 'sophisticated']).toContain(dna.languageComplexity);
  });

  it('defaults to Warm emotional register', () => {
    const dna = createDefaultCommunicationDNA();
    expect(dna.emotionalRegister).toBe(EmotionalRegister.Warm);
  });
});

describe('adaptCommunicationDNA', () => {
  it('does not mutate the input DNA', () => {
    const original = createDefaultCommunicationDNA();
    const originalDirectness = original.directnessLevel;
    adaptCommunicationDNA(original, { prefersDirect: true });
    expect(original.directnessLevel).toBe(originalDirectness);
  });

  it('increases directnessLevel by ~0.1 when prefersDirect is true', () => {
    const dna = createDefaultCommunicationDNA(); // 0.5
    const adapted = adaptCommunicationDNA(dna, { prefersDirect: true });
    expect(adapted.directnessLevel).toBeCloseTo(dna.directnessLevel + 0.1, 5);
  });

  it('decreases directnessLevel by ~0.1 when "too_direct" is disliked', () => {
    const dna = createDefaultCommunicationDNA();
    const adapted = adaptCommunicationDNA(dna, { disliked: ['too_direct'] });
    expect(adapted.directnessLevel).toBeCloseTo(dna.directnessLevel - 0.1, 5);
  });

  it('increases humourLevel by ~0.1 when engagedWithHumour is true', () => {
    const dna = createDefaultCommunicationDNA();
    const adapted = adaptCommunicationDNA(dna, { engagedWithHumour: true });
    expect(adapted.humourLevel).toBeCloseTo(dna.humourLevel + 0.1, 5);
  });

  it('increases challengeLevel by ~0.1 when engagedWithChallenge is true', () => {
    const dna = createDefaultCommunicationDNA();
    const adapted = adaptCommunicationDNA(dna, { engagedWithChallenge: true });
    expect(adapted.challengeLevel).toBeCloseTo(dna.challengeLevel + 0.1, 5);
  });

  it('clamps directnessLevel at 1.0 (does not exceed max)', () => {
    const dna = { ...createDefaultCommunicationDNA(), directnessLevel: 0.95 };
    const adapted = adaptCommunicationDNA(dna, { prefersDirect: true });
    expect(adapted.directnessLevel).toBeLessThanOrEqual(1.0);
  });

  it('clamps directnessLevel at 0.0 (does not go below min)', () => {
    const dna = { ...createDefaultCommunicationDNA(), directnessLevel: 0.05 };
    const adapted = adaptCommunicationDNA(dna, { disliked: ['too_direct'] });
    expect(adapted.directnessLevel).toBeGreaterThanOrEqual(0.0);
  });

  it('clamps humourLevel at 0.0 when disliked', () => {
    const dna = { ...createDefaultCommunicationDNA(), humourLevel: 0.05 };
    const adapted = adaptCommunicationDNA(dna, { disliked: ['humour'] });
    expect(adapted.humourLevel).toBeGreaterThanOrEqual(0.0);
  });

  it('nudges metaphorUsage up from low to moderate', () => {
    const dna = { ...createDefaultCommunicationDNA(), metaphorUsage: 'low' as const };
    const adapted = adaptCommunicationDNA(dna, { prefersMetaphors: true });
    expect(adapted.metaphorUsage).toBe('moderate');
  });

  it('nudges metaphorUsage down from high to moderate', () => {
    const dna = { ...createDefaultCommunicationDNA(), metaphorUsage: 'high' as const };
    const adapted = adaptCommunicationDNA(dna, { disliked: ['too_abstract'] });
    expect(adapted.metaphorUsage).toBe('moderate');
  });

  it('nudges pacing up from brief to moderate when too_brief disliked', () => {
    const dna = { ...createDefaultCommunicationDNA(), pacing: 'brief' as const };
    const adapted = adaptCommunicationDNA(dna, { disliked: ['too_brief'] });
    expect(adapted.pacing).toBe('moderate');
  });

  it('nudges pacing down from expansive to moderate when too_long disliked', () => {
    const dna = { ...createDefaultCommunicationDNA(), pacing: 'expansive' as const };
    const adapted = adaptCommunicationDNA(dna, { disliked: ['too_long'] });
    expect(adapted.pacing).toBe('moderate');
  });

  it('adopts the dominant register from respondedWellTo', () => {
    const dna = createDefaultCommunicationDNA();
    const adapted = adaptCommunicationDNA(dna, {
      respondedWellTo: [
        EmotionalRegister.Playful,
        EmotionalRegister.Playful,
        EmotionalRegister.Gentle,
      ],
    });
    expect(adapted.emotionalRegister).toBe(EmotionalRegister.Playful);
  });

  it('all returned numeric values remain in [0, 1]', () => {
    const dna = createDefaultCommunicationDNA();
    const adapted = adaptCommunicationDNA(dna, {
      prefersDirect: true,
      engagedWithHumour: true,
      engagedWithChallenge: true,
    });
    expect(adapted.directnessLevel).toBeGreaterThanOrEqual(0);
    expect(adapted.directnessLevel).toBeLessThanOrEqual(1);
    expect(adapted.humourLevel).toBeGreaterThanOrEqual(0);
    expect(adapted.humourLevel).toBeLessThanOrEqual(1);
    expect(adapted.challengeLevel).toBeGreaterThanOrEqual(0);
    expect(adapted.challengeLevel).toBeLessThanOrEqual(1);
  });
});
