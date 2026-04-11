/**
 * GradientEncoder: adds differential privacy noise to gradients
 * before sending to the federation server.
 *
 * Uses Gaussian mechanism with privacy budget epsilon.
 */
export class GradientEncoder {
  private epsilon: number;
  private sensitivity: number;

  constructor(epsilon: number = 1.0, sensitivity: number = 1.0) {
    this.epsilon = epsilon;
    this.sensitivity = sensitivity;
  }

  /**
   * Add calibrated Gaussian noise to each gradient value.
   * sigma = sensitivity * sqrt(2 * ln(1.25/delta)) / epsilon
   * where delta = 1e-5 (standard choice)
   */
  encode(gradients: number[]): number[] {
    const delta = 1e-5;
    const sigma = this.sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / this.epsilon;

    return gradients.map(g => {
      const noise = this.gaussianNoise(sigma);
      return Math.round((g + noise) * 10000) / 10000;
    });
  }

  private gaussianNoise(sigma: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * sigma;
  }
}
