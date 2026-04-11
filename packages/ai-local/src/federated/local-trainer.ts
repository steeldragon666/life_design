export interface TrainingData {
  features: number[][];    // n_samples x n_features
  targets: number[];       // n_samples
}

export interface GradientUpdate {
  weights: number[];       // gradient for each weight
  bias: number;            // gradient for bias
  sampleCount: number;     // how many samples used
  loss: number;            // training loss
}

/**
 * LocalTrainer: trains a linear model on user data and produces gradient updates
 * for federated aggregation. Never sends raw data — only encrypted gradients.
 */
export class LocalTrainer {
  private learningRate: number;
  private epochs: number;

  constructor(learningRate: number = 0.01, epochs: number = 10) {
    this.learningRate = learningRate;
    this.epochs = epochs;
  }

  /**
   * Train on local data and return gradient updates.
   * Uses simple gradient descent on MSE loss.
   */
  train(data: TrainingData, initialWeights?: number[]): GradientUpdate {
    const { features, targets } = data;
    if (features.length === 0 || features.length !== targets.length) {
      throw new Error('Invalid training data');
    }

    const nFeatures = features[0].length;
    const weights = initialWeights?.slice() ?? new Array(nFeatures).fill(0);
    let bias = 0;

    // Gradient descent
    for (let epoch = 0; epoch < this.epochs; epoch++) {
      const gradW = new Array(nFeatures).fill(0);
      let gradB = 0;
      let totalLoss = 0;

      for (let i = 0; i < features.length; i++) {
        let pred = bias;
        for (let j = 0; j < nFeatures; j++) {
          pred += features[i][j] * weights[j];
        }
        const error = pred - targets[i];
        totalLoss += error * error;

        for (let j = 0; j < nFeatures; j++) {
          gradW[j] += (2 / features.length) * error * features[i][j];
        }
        gradB += (2 / features.length) * error;
      }

      for (let j = 0; j < nFeatures; j++) {
        weights[j] -= this.learningRate * gradW[j];
      }
      bias -= this.learningRate * gradB;
    }

    // Compute final gradients (difference from initial)
    const finalGradW = initialWeights
      ? weights.map((w, i) => w - initialWeights[i])
      : weights;

    const loss = targets.reduce((sum, t, i) => {
      let pred = bias;
      for (let j = 0; j < nFeatures; j++) pred += features[i][j] * weights[j];
      return sum + (pred - t) ** 2;
    }, 0) / targets.length;

    return {
      weights: finalGradW,
      bias,
      sampleCount: features.length,
      loss: Math.round(loss * 10000) / 10000,
    };
  }
}
