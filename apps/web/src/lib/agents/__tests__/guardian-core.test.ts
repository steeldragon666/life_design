import { describe, it, expect } from 'vitest';
import { ActionSynthesizer } from '../action-synthesizer';
import { Dimension } from '@life-design/core';
import type { FeatureWeight, GuardianLogEntry } from '../../ml/types';

describe('ActionSynthesizer', () => {
  const synthesizer = new ActionSynthesizer();

  it('generates non-empty string for burnout trigger', () => {
    const result = synthesizer.generate({
      triggerType: 'burnout',
      dimensionsAffected: [Dimension.Career, Dimension.Health],
      topFeatures: [
        { feature: 'meeting_load', weight: 0.9, humanLabel: 'heavy meeting load' },
        { feature: 'after_hours_work', weight: 0.8, humanLabel: 'after-hours work' },
      ],
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('generates non-empty string for isolation trigger', () => {
    const result = synthesizer.generate({
      triggerType: 'isolation',
      dimensionsAffected: [Dimension.Social, Dimension.Family],
      topFeatures: [
        { feature: 'digital_fatigue', weight: 0.85, humanLabel: 'screen fatigue' },
      ],
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('generates non-empty string for flow_state trigger', () => {
    const result = synthesizer.generate({
      triggerType: 'flow_state',
      dimensionsAffected: [Dimension.Career, Dimension.Growth],
      topFeatures: [],
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains no unsubstituted placeholders', () => {
    const triggerTypes: GuardianLogEntry['triggerType'][] = ['burnout', 'isolation', 'flow_state'];

    for (const triggerType of triggerTypes) {
      // Run multiple times to catch both template variants
      for (let i = 0; i < 20; i++) {
        const result = synthesizer.generate({
          triggerType,
          dimensionsAffected: [Dimension.Career, Dimension.Health],
          topFeatures: [
            { feature: 'meeting_load', weight: 0.9, humanLabel: 'heavy meeting load' },
            { feature: 'after_hours_work', weight: 0.8, humanLabel: 'after-hours work' },
          ],
        });
        expect(result).not.toMatch(/\{dim1\}/);
        expect(result).not.toMatch(/\{dim2\}/);
        expect(result).not.toMatch(/\{feature1\}/);
        expect(result).not.toMatch(/\{feature2\}/);
        expect(result).not.toMatch(/\{days\}/);
      }
    }
  });

  it('handles empty dimensions and features gracefully', () => {
    const result = synthesizer.generate({
      triggerType: 'burnout',
      dimensionsAffected: [],
      topFeatures: [],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toMatch(/\{/);
  });

  it('uses fallback templates for unknown trigger type', () => {
    const result = synthesizer.generate({
      triggerType: 'unknown' as GuardianLogEntry['triggerType'],
      dimensionsAffected: [Dimension.Career],
      topFeatures: [],
    });
    expect(result.length).toBeGreaterThan(0);
  });
});
