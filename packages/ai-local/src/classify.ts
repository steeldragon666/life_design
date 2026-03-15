import { pipeline, type ZeroShotClassificationPipeline } from '@huggingface/transformers';
import { MODEL_REGISTRY, DIMENSION_LABELS, lazySingleton, type DimensionLabel } from './models';

const getClassifier = lazySingleton<ZeroShotClassificationPipeline>(async (onProgress) => {
  return (await pipeline(
    'zero-shot-classification',
    MODEL_REGISTRY.classification.modelId,
    { progress_callback: onProgress },
  )) as ZeroShotClassificationPipeline;
});

/**
 * Classify text against the 8 life dimensions using zero-shot NLI.
 * Returns a record mapping each dimension to its probability score.
 */
export async function classifyDimension(
  text: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<Record<DimensionLabel, number>> {
  if (!text.trim()) {
    // Return uniform scores for empty input
    const uniform = 1 / DIMENSION_LABELS.length;
    const scores: Record<string, number> = {};
    for (const dim of DIMENSION_LABELS) {
      scores[dim] = uniform;
    }
    return scores as Record<DimensionLabel, number>;
  }

  const cls = await getClassifier(onProgress);
  const result = await cls(text, [...DIMENSION_LABELS], {
    multi_label: true,
  });

  const scores: Record<string, number> = {};
  const labels = (result as { labels: string[]; scores: number[] }).labels;
  const resultScores = (result as { labels: string[]; scores: number[] }).scores;

  for (let i = 0; i < labels.length; i++) {
    scores[labels[i]] = resultScores[i];
  }

  return scores as Record<DimensionLabel, number>;
}
