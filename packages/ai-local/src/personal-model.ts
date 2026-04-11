import type { ModelArtifact } from '@life-design/core';

export class PersonalModel {
  private weights: number[];
  private intercept: number;
  private featureNames: string[];
  private targetDimension: string;

  constructor(artifact: ModelArtifact) {
    this.weights = artifact.weights;
    this.intercept = artifact.intercept;
    this.featureNames = artifact.featureNames;
    this.targetDimension = artifact.targetDimension ?? 'unknown';
  }

  /**
   * Run inference: y = X * w + b
   * @param features - Record of feature name -> value
   * @returns predicted score (clamped to 1-5)
   */
  predict(features: Record<string, number>): number {
    let score = this.intercept;
    for (let i = 0; i < this.featureNames.length; i++) {
      const featureValue = features[this.featureNames[i]] ?? 0;
      score += featureValue * this.weights[i];
    }
    return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
  }

  /**
   * Get feature importance for this model.
   */
  getFeatureImportance(): Array<{ feature: string; importance: number }> {
    return this.featureNames
      .map((name, i) => ({ feature: name, importance: Math.abs(this.weights[i]) }))
      .sort((a, b) => b.importance - a.importance);
  }

  get dimension(): string {
    return this.targetDimension;
  }

  get version(): number {
    return 0; // Will come from artifact
  }
}
