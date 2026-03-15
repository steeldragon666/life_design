import { pipeline, type SummarizationPipeline } from '@huggingface/transformers';
import { MODEL_REGISTRY, lazySingleton } from './models';

const getSummarizer = lazySingleton<SummarizationPipeline>(async (onProgress) => {
  return (await pipeline('summarization', MODEL_REGISTRY.summarization.modelId, {
    progress_callback: onProgress,
  })) as SummarizationPipeline;
});

/**
 * Produce an abstractive summary of the given text.
 * @param text - Input text to summarize
 * @param maxLength - Maximum token length of the summary (default: 100)
 */
export async function summarize(
  text: string,
  maxLength = 100,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<string> {
  if (!text.trim()) return '';

  const sum = await getSummarizer(onProgress);
  const result = await sum(text, {
    max_new_tokens: maxLength,
    min_length: Math.min(20, Math.floor(maxLength / 3)),
  });
  const output = result as Array<{ summary_text: string }>;
  return output[0]?.summary_text ?? '';
}
