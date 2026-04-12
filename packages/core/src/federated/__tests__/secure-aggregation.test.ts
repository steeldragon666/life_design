import { describe, it, expect } from 'vitest';
import {
  generateMask,
  applyMask,
  removeMask,
  createSecretShares,
  reconstructFromShares,
  verifyMaskCancellation,
  type MaskedGradient,
} from '../secure-aggregation';

describe('Secure Aggregation', () => {
  it('generateMask produces deterministic output from same seed', () => {
    const mask1 = generateMask(42, 5);
    const mask2 = generateMask(42, 5);
    expect(mask1).toEqual(mask2);
    expect(mask1).toHaveLength(5);
  });

  it('generateMask produces different output from different seed', () => {
    const mask1 = generateMask(42, 5);
    const mask2 = generateMask(99, 5);
    expect(mask1).not.toEqual(mask2);
  });

  it('applyMask + removeMask round-trips correctly', () => {
    const original = [1.5, -2.3, 0.7, 4.1];
    const mask = generateMask(123, 4);
    const masked = applyMask(original, mask);
    const recovered = removeMask(masked, mask);

    for (let i = 0; i < original.length; i++) {
      expect(recovered[i]).toBeCloseTo(original[i], 10);
    }
  });

  it('createSecretShares: shares sum to original value', () => {
    const original = [3.0, -1.5, 2.7];
    const shares = createSecretShares(original, 3);
    expect(shares).toHaveLength(3);

    const reconstructed = reconstructFromShares(shares);
    for (let i = 0; i < original.length; i++) {
      expect(reconstructed[i]).toBeCloseTo(original[i], 10);
    }
  });

  it('createSecretShares: individual shares reveal nothing', () => {
    const original = [3.0, -1.5, 2.7];
    const shares = createSecretShares(original, 3);

    // Each individual share should not equal the original
    for (const share of shares) {
      const isIdentical = share.value.every(
        (v, i) => Math.abs(v - original[i]) < 1e-10,
      );
      expect(isIdentical).toBe(false);
    }

    // Shares should be non-zero (with overwhelming probability)
    for (const share of shares) {
      const allZero = share.value.every((v) => Math.abs(v) < 1e-10);
      expect(allZero).toBe(false);
    }
  });

  it('reconstructFromShares recovers original', () => {
    const original = [10.0, -5.0, 0.0, 3.14];
    const shares = createSecretShares(original, 5);
    const recovered = reconstructFromShares(shares);

    for (let i = 0; i < original.length; i++) {
      expect(recovered[i]).toBeCloseTo(original[i], 10);
    }
  });

  it('masks cancel in pairwise aggregation scenario', () => {
    // Simulate two participants who share a pairwise seed
    const pairwiseSeed = 777;
    const length = 4;

    const gradientsA = [1.0, 2.0, 3.0, 4.0];
    const gradientsB = [5.0, 6.0, 7.0, 8.0];

    const mask = generateMask(pairwiseSeed, length);

    // A adds mask, B subtracts mask
    const maskedA: MaskedGradient = {
      maskedWeights: applyMask(gradientsA, mask),
      maskedBias: 0,
      maskSeed: pairwiseSeed,
    };

    const maskedB: MaskedGradient = {
      maskedWeights: removeMask(gradientsB, mask),
      maskedBias: 0,
      maskSeed: pairwiseSeed,
    };

    // When summed, masks cancel out: (A + mask) + (B - mask) = A + B
    const summed = maskedA.maskedWeights.map(
      (v, i) => v + maskedB.maskedWeights[i],
    );

    for (let i = 0; i < length; i++) {
      expect(summed[i]).toBeCloseTo(gradientsA[i] + gradientsB[i], 10);
    }

    // Verify using the helper
    const seeds = new Map<string, number>();
    seeds.set('A-B', pairwiseSeed);
    expect(verifyMaskCancellation([maskedA, maskedB], seeds)).toBe(true);
  });
});
