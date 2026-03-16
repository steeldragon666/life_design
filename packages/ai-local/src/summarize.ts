import { embedBatch } from './embed';
import { cosineSimilarity } from './similarity';

/**
 * Extractive summarization: splits text into sentences, embeds each sentence
 * and the full text, ranks sentences by cosine similarity to the full-text
 * centroid, then greedily picks the highest-ranked sentences (in original
 * order) until maxLength characters are reached.
 *
 * @param text      - Input text to summarize
 * @param maxLength - Maximum character length of the returned summary (default: 100)
 */
export async function summarize(
  text: string,
  maxLength = 100,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<string> {
  if (!text.trim()) return '';

  // Step 1: split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g);

  // No sentence-ending punctuation found
  if (!sentences || sentences.length === 0) {
    return text.trim().slice(0, maxLength);
  }

  // Single sentence – no need to rank
  if (sentences.length === 1) {
    return sentences[0].trim().slice(0, maxLength);
  }

  // Step 2: embed all sentences + full text (full text appended last)
  const allTexts = [...sentences, text];
  const embeddings = await embedBatch(allTexts, onProgress);

  const fullTextEmbedding = embeddings[embeddings.length - 1];
  const sentenceEmbeddings = embeddings.slice(0, sentences.length);

  // Step 3: score each sentence against the full-text centroid
  const scored = sentences.map((sentence, idx) => ({
    sentence,
    idx,
    score: cosineSimilarity(sentenceEmbeddings[idx], fullTextEmbedding),
  }));

  // Step 4: sort by descending similarity score
  scored.sort((a, b) => b.score - a.score);

  // Step 5: greedily pick sentences until maxLength is exceeded
  const selected = new Set<number>();
  let charCount = 0;

  for (const { idx, sentence } of scored) {
    const trimmed = sentence.trim();
    if (charCount + trimmed.length > maxLength && selected.size > 0) {
      break;
    }
    selected.add(idx);
    charCount += trimmed.length + 1; // +1 for the joining space
    if (charCount >= maxLength) break;
  }

  // Step 6: reconstruct in original sentence order
  const result = sentences
    .filter((_, idx) => selected.has(idx))
    .map((s) => s.trim())
    .join(' ');

  return result;
}

/**
 * Generate a short preview of a journal entry.
 * If the text is under 100 characters, returns it unchanged.
 * Designed to run as the user types (caller should debounce).
 */
export async function generateJournalPreview(
  text: string,
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<string> {
  if (!text.trim()) return '';
  if (text.length < 100) return text;

  return summarize(text, 120, onProgress);
}

/**
 * Concatenate a week's journal entries and summarize the overall themes.
 * Used for the weekly digest feature.
 */
export async function summarizeWeeklyJournals(
  journals: string[],
  onProgress?: (progress: { status: string; progress?: number }) => void,
): Promise<string> {
  const nonEmpty = journals.filter((j) => j.trim());
  if (nonEmpty.length === 0) return '';

  const combined = nonEmpty.join(' ');

  return summarize(combined, 300, onProgress);
}
