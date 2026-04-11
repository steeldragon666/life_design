import { describe, it, expect } from 'vitest';
import { buildCrisisResponse, CRISIS_RESOURCES } from '../crisis-response';
import { CrisisLevel } from '../types';

describe('buildCrisisResponse', () => {
  it('returns resources for high-level crisis', () => {
    const response = buildCrisisResponse(CrisisLevel.High);
    expect(response.level).toBe(CrisisLevel.High);
    expect(response.message).toContain("what you're feeling matters");
    expect(response.resources.length).toBeGreaterThan(0);
  });

  it('returns resources for medium-level crisis', () => {
    const response = buildCrisisResponse(CrisisLevel.Medium);
    expect(response.level).toBe(CrisisLevel.Medium);
    expect(response.message).toContain('really difficult time');
    expect(response.resources.length).toBeGreaterThan(0);
  });

  it('returns resources for low-level distress', () => {
    const response = buildCrisisResponse(CrisisLevel.Low);
    expect(response.level).toBe(CrisisLevel.Low);
    expect(response.message).toContain('things are tough');
    expect(response.resources.length).toBeGreaterThan(0);
  });

  it('returns empty for no crisis', () => {
    const response = buildCrisisResponse(CrisisLevel.None);
    expect(response.message).toBe('');
    expect(response.resources).toHaveLength(0);
  });

  it('includes Lifeline in resources', () => {
    const response = buildCrisisResponse(CrisisLevel.High);
    const lifeline = response.resources.find((r) => r.name === 'Lifeline');
    expect(lifeline).toBeDefined();
    expect(lifeline!.phone).toBe('13 11 14');
  });

  it('includes Beyond Blue in resources', () => {
    const response = buildCrisisResponse(CrisisLevel.High);
    const bb = response.resources.find((r) => r.name === 'Beyond Blue');
    expect(bb).toBeDefined();
    expect(bb!.phone).toBe('1300 22 4636');
  });

  it('includes Emergency Services in resources', () => {
    const response = buildCrisisResponse(CrisisLevel.High);
    const emergency = response.resources.find((r) => r.name === 'Emergency Services');
    expect(emergency).toBeDefined();
    expect(emergency!.phone).toBe('000');
  });

  it('includes 13YARN for Aboriginal and Torres Strait Islander peoples', () => {
    const response = buildCrisisResponse(CrisisLevel.High);
    const yarn = response.resources.find((r) => r.name === '13YARN');
    expect(yarn).toBeDefined();
    expect(yarn!.phone).toBe('13 92 76');
  });
});

describe('CRISIS_RESOURCES', () => {
  it('has at least 3 resources', () => {
    expect(CRISIS_RESOURCES.length).toBeGreaterThanOrEqual(3);
  });

  it('all resources have name and phone', () => {
    for (const resource of CRISIS_RESOURCES) {
      expect(resource.name).toBeTruthy();
      expect(resource.phone).toBeTruthy();
      expect(resource.description).toBeTruthy();
    }
  });
});
