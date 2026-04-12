/**
 * @module client
 *
 * Public surface of the DRM client layer.
 * Exports the Claude API wrapper, model router, and embedding utilities.
 */

export {
  createClaudeClient,
  sendMessage,
  streamMessage,
  sendBatchMessage,
} from './claude-client';

export type {
  MessageParam,
  SendMessageParams,
  MessageResult,
  StreamMessageResult,
  BatchMessageResult,
} from './claude-client';

export {
  ModelTask,
  routeToModel,
  SONNET_MODEL,
  OPUS_MODEL,
} from './model-router';

export type { ModelConfig } from './model-router';

export {
  generateEmbedding,
  cosineSimilarity,
  EMBEDDING_DIMENSIONS,
} from './embeddings';
