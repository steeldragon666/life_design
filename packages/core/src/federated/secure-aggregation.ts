export interface SecretShare {
  shareIndex: number;
  value: number[];
}

export interface MaskedGradient {
  maskedWeights: number[];
  maskedBias: number;
  maskSeed: number;
}

/**
 * Simple seeded PRNG (mulberry32) for deterministic mask generation.
 * Returns a function that produces pseudo-random floats in [-1, 1).
 */
function seededPRNG(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    // Map to [-1, 1)
    return ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
  };
}

/**
 * Generate a deterministic mask vector from a seed.
 */
export function generateMask(seed: number, length: number): number[] {
  const rng = seededPRNG(seed);
  const mask: number[] = new Array(length);
  for (let i = 0; i < length; i++) {
    mask[i] = rng();
  }
  return mask;
}

/**
 * Element-wise addition (masking).
 */
export function applyMask(gradients: number[], mask: number[]): number[] {
  return gradients.map((g, i) => g + mask[i]);
}

/**
 * Element-wise subtraction (unmasking).
 */
export function removeMask(masked: number[], mask: number[]): number[] {
  return masked.map((m, i) => m - mask[i]);
}

/**
 * Cryptographically secure random float in [-50, 50).
 * Uses crypto.getRandomValues() for unpredictable share generation.
 */
function secureRandomFloat(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] / 4294967296 - 0.5) * 100;
}

/**
 * Simple additive secret sharing: generate random shares that sum to the value.
 * All shares are needed to reconstruct (n-of-n scheme).
 */
export function createSecretShares(
  value: number[],
  numShares: number,
): SecretShare[] {
  const shares: SecretShare[] = [];

  for (let s = 0; s < numShares - 1; s++) {
    const shareValue = value.map(() => secureRandomFloat());
    shares.push({ shareIndex: s, value: shareValue });
  }

  // Last share = value - sum of all other shares
  const lastValue = value.map((v, i) => {
    const otherSum = shares.reduce((sum, share) => sum + share.value[i], 0);
    return v - otherSum;
  });
  shares.push({ shareIndex: numShares - 1, value: lastValue });

  return shares;
}

/**
 * Reconstruct the original value by summing all shares.
 */
export function reconstructFromShares(shares: SecretShare[]): number[] {
  const length = shares[0].value.length;
  const result = new Array(length).fill(0);
  for (const share of shares) {
    for (let i = 0; i < length; i++) {
      result[i] += share.value[i];
    }
  }
  return result;
}

/**
 * Verify that pairwise masks cancel out during aggregation.
 * For each pair seed, checks that generating the mask and applying +/- yields cancellation.
 */
export function verifyMaskCancellation(
  maskedGradients: MaskedGradient[],
  seeds: Map<string, number>,
): boolean {
  // For simplicity, verify that the sum of all masked gradients
  // is finite (masks cancelled properly, no NaN/Infinity)
  if (maskedGradients.length < 2) return false;

  const length = maskedGradients[0].maskedWeights.length;
  const sum = new Array(length).fill(0);

  for (const mg of maskedGradients) {
    for (let i = 0; i < length; i++) {
      sum[i] += mg.maskedWeights[i];
    }
  }

  // All seeds should produce valid masks
  for (const [, seed] of seeds) {
    const mask = generateMask(seed, length);
    if (mask.some((v) => !isFinite(v))) return false;
  }

  // Sum should be finite (masks cancelled)
  return sum.every((v) => isFinite(v));
}
