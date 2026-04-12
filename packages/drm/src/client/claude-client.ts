/**
 * @module client/claude-client
 *
 * Thin, typed wrapper around the Anthropic SDK.
 * Provides non-streaming, streaming, and batch message dispatch with
 * consistent error handling across all call sites.
 */

import Anthropic from '@anthropic-ai/sdk';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MessageParam {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessageParams {
  model: string;
  systemPrompt: string;
  messages: MessageParam[];
  maxTokens: number;
  temperature: number;
}

export interface MessageResult {
  text: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface StreamMessageResult {
  text: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface BatchMessageResult {
  requestId: string | null;
  error: string | null;
}

// ── Singleton factory ────────────────────────────────────────────────────────

let instance: Anthropic | null = null;

/**
 * Returns a singleton Anthropic client initialised with the given API key.
 * Subsequent calls with a different key are ignored — call this once at
 * application startup before any other client function.
 */
export function createClaudeClient(apiKey: string): Anthropic {
  if (!instance) {
    instance = new Anthropic({ apiKey });
  }
  return instance;
}

/**
 * Retrieve the existing singleton, throwing if it has not been created.
 * Internal helper used by sendMessage / streamMessage / sendBatchMessage.
 */
function getClient(): Anthropic {
  if (!instance) {
    throw new Error(
      'Claude client not initialised — call createClaudeClient(apiKey) first.',
    );
  }
  return instance;
}

// ── Non-streaming message ────────────────────────────────────────────────────

/**
 * Send a single non-streaming message and return the full text response
 * alongside token usage counts.
 *
 * Returns `{ text: null, error: string }` on any SDK or network failure so
 * callers never need to try/catch.
 */
export async function sendMessage(
  params: SendMessageParams,
): Promise<MessageResult> {
  try {
    const client = getClient();

    const response = await client.messages.create({
      model: params.model,
      system: params.systemPrompt,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );

    return {
      text: textBlock?.text ?? null,
      error: null,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

// ── Streaming message ────────────────────────────────────────────────────────

/**
 * Stream a message response as an async generator.
 *
 * Each `yield` delivers a text chunk as it arrives.  The generator's return
 * value (captured via `for await` + checking `.return()`, or by using
 * `await gen.return(...)`) carries the final `StreamMessageResult` with token
 * counts.
 *
 * On error the generator returns early with `{ text: null, error: string }`.
 *
 * @example
 * ```ts
 * const gen = streamMessage(params);
 * let result: StreamMessageResult;
 * for await (const chunk of gen) {
 *   process.stdout.write(chunk);
 * }
 * // Access return value after the loop via the generator directly:
 * // const { value: stats } = await gen.return(undefined);
 * ```
 */
export async function* streamMessage(
  params: SendMessageParams,
): AsyncGenerator<string, StreamMessageResult, void> {
  try {
    const client = getClient();

    const stream = client.messages.stream({
      model: params.model,
      system: params.systemPrompt,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    });

    let fullText = '';

    // The SDK's MessageStream is an AsyncIterable<MessageStreamEvent>.
    // We filter for text-delta events and yield only the text portion.
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullText += event.delta.text;
        yield event.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();

    return {
      text: fullText,
      error: null,
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

// ── Batch message ─────────────────────────────────────────────────────────────

/**
 * Submit a message via the Anthropic Message Batches API (background
 * processing at ~50 % cost, asynchronous delivery).
 *
 * Returns the batch `requestId` so the caller can poll for results, or an
 * `error` string on failure.
 */
export async function sendBatchMessage(
  params: SendMessageParams & { customId?: string },
): Promise<BatchMessageResult> {
  try {
    const client = getClient();

    const customId =
      params.customId ?? `drm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const batch = await client.messages.batches.create({
      requests: [
        {
          custom_id: customId,
          params: {
            model: params.model,
            system: params.systemPrompt,
            messages: params.messages,
            max_tokens: params.maxTokens,
            temperature: params.temperature,
          },
        },
      ],
    });

    return {
      requestId: batch.id,
      error: null,
    };
  } catch (err) {
    return {
      requestId: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
