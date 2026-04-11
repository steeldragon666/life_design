import { describe, it, expect } from 'vitest';
import { detectLinguisticBiomarkers } from '../linguistic-biomarkers';
import type { BiomarkerResult } from '../linguistic-biomarkers';

describe('detectLinguisticBiomarkers', () => {
  it('returns low risk and no distortions for clean text', () => {
    const result = detectLinguisticBiomarkers('Today was a regular day at the office.');
    expect(result.distortions).toHaveLength(0);
    expect(result.overallRisk).toBe('low');
  });

  it('detects all_or_nothing distortion in "I always fail at everything"', () => {
    const result = detectLinguisticBiomarkers('I always fail at everything');
    const types = result.distortions.map((d) => d.type);
    expect(types).toContain('all_or_nothing');
    // "always" and "everything" should both trigger
    expect(result.distortions.length).toBeGreaterThanOrEqual(2);
    // Each distortion should have trigger, position, and confidence
    for (const d of result.distortions) {
      expect(d.trigger).toBeTruthy();
      expect(typeof d.position).toBe('number');
      expect(d.confidence).toBeGreaterThan(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('detects catastrophising and all_or_nothing in "This is the worst thing ever, totally ruined"', () => {
    const result = detectLinguisticBiomarkers(
      'This is the worst thing ever, totally ruined',
    );
    const types = result.distortions.map((d) => d.type);
    expect(types).toContain('catastrophising');
    expect(types).toContain('all_or_nothing');
  });

  it('detects personalisation in "It\'s my fault, I caused this"', () => {
    const result = detectLinguisticBiomarkers("It's my fault, I caused this");
    const types = result.distortions.map((d) => d.type);
    expect(types).toContain('personalisation');
  });

  it('classifies elevated risk when multiple distortions are present', () => {
    const result = detectLinguisticBiomarkers(
      'I always fail. It is the worst disaster. Everything is my fault because of me.',
    );
    expect(result.distortions.length).toBeGreaterThanOrEqual(3);
    expect(result.overallRisk).toBe('elevated');
  });

  it('returns low risk and positive word count > 0 for positive text', () => {
    const result = detectLinguisticBiomarkers(
      'I feel happy and grateful for today. I am inspired and confident.',
    );
    expect(result.overallRisk).toBe('low');
    expect(result.sentimentIndicators.positiveWordCount).toBeGreaterThan(0);
  });

  it('counts first person singular pronouns correctly', () => {
    // "I" (x2), "my" (x1) = 3
    const result = detectLinguisticBiomarkers(
      "I feel like I can't do anything my way",
    );
    expect(result.sentimentIndicators.firstPersonSingularCount).toBe(3);
  });

  it('detects patterns case-insensitively', () => {
    const result = detectLinguisticBiomarkers('I ALWAYS fail at EVERYTHING');
    const types = result.distortions.map((d) => d.type);
    expect(types).toContain('all_or_nothing');
    expect(result.distortions.length).toBeGreaterThanOrEqual(2);
  });

  it('returns low risk and zero counts for empty text', () => {
    const result = detectLinguisticBiomarkers('');
    expect(result.distortions).toHaveLength(0);
    expect(result.overallRisk).toBe('low');
    expect(result.sentimentIndicators.negativeWordCount).toBe(0);
    expect(result.sentimentIndicators.positiveWordCount).toBe(0);
    expect(result.sentimentIndicators.firstPersonSingularCount).toBe(0);
    expect(result.sentimentIndicators.absoluteTermCount).toBe(0);
  });

  it('classifies moderate risk with 1-2 distortions', () => {
    const result = detectLinguisticBiomarkers('I always struggle with this.');
    expect(result.distortions.length).toBeGreaterThanOrEqual(1);
    expect(result.distortions.length).toBeLessThanOrEqual(2);
    expect(result.overallRisk).toBe('moderate');
  });

  it('counts negative words correctly', () => {
    const result = detectLinguisticBiomarkers(
      'I feel sad and hopeless. I am anxious and overwhelmed.',
    );
    expect(result.sentimentIndicators.negativeWordCount).toBeGreaterThanOrEqual(4);
  });

  it('counts absolute terms correctly', () => {
    const result = detectLinguisticBiomarkers(
      'I never get anything right. Nothing works. I always mess up everything.',
    );
    expect(result.sentimentIndicators.absoluteTermCount).toBeGreaterThanOrEqual(4);
  });
});
