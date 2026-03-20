/**
 * Web Worker entry point for client-side ML inference.
 * All heavy model loading and inference runs here, off the main thread.
 *
 * Communication protocol:
 *   Main → Worker: { id, type: 'embed'|'classify'|'summarize', payload }
 *   Worker → Main: { id, type: 'result', data } | { id, type: 'error', error }
 *   Worker → Main: { type: 'progress', task, progress }
 *
 * ⚠️ ArrayBuffer transfer:
 *   embed/embedBatch results use postMessage transferable objects (the second
 *   argument to postMessage). This performs a zero-copy transfer of the
 *   Float32Array's underlying ArrayBuffer to the main thread. After transfer,
 *   the buffer is *detached* in this Worker — accessing it here would throw.
 *   This is intentional: the Worker doesn't need the buffer after sending it.
 */

import { embed, embedBatch } from './embed';
import { classifyDimension, classifyGoal, classifyJournalEntry, detectMoodFromText } from './classify';
import { summarize, generateJournalPreview, summarizeWeeklyJournals } from './summarize';
import { processVoiceCheckIn } from './voice-processor';

export type WorkerMessageType =
  | 'embed' | 'embedBatch'
  | 'classify' | 'classifyGoal' | 'classifyJournal' | 'detectMood'
  | 'summarize' | 'journalPreview' | 'summarizeWeekly'
  | 'voiceProcess';

export interface WorkerRequest {
  id: string;
  type: WorkerMessageType;
  payload: {
    text?: string;
    texts?: string[];
    maxLength?: number;
  };
}

export interface WorkerResultMessage {
  id: string;
  type: 'result';
  data: unknown;
}

export interface WorkerErrorMessage {
  id: string;
  type: 'error';
  error: string;
}

export interface WorkerProgressMessage {
  type: 'progress';
  task: string;
  progress: { status: string; progress?: number };
}

export type WorkerResponse = WorkerResultMessage | WorkerErrorMessage | WorkerProgressMessage;

const ctx = self as unknown as Worker;

function sendProgress(task: string, progress: { status: string; progress?: number }) {
  ctx.postMessage({ type: 'progress', task, progress } satisfies WorkerProgressMessage);
}

ctx.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;

  try {
    let data: unknown;

    switch (type) {
      case 'embed': {
        const vec = await embed(payload.text ?? '', (p) => sendProgress('embedding', p));
        // Transfer the underlying ArrayBuffer for zero-copy (buffer is detached after this)
        data = vec;
        ctx.postMessage({ id, type: 'result', data } satisfies WorkerResultMessage, [vec.buffer]);
        return;
      }
      case 'embedBatch': {
        const vecs = await embedBatch(payload.texts ?? [], (p) => sendProgress('embedding', p));
        data = vecs;
        // Transfer all buffers — each is detached after this call
        const buffers = vecs.map((v) => v.buffer);
        ctx.postMessage({ id, type: 'result', data } satisfies WorkerResultMessage, buffers);
        return;
      }
      case 'classify': {
        data = await classifyDimension(payload.text ?? '', (p) => sendProgress('classification', p));
        break;
      }
      case 'classifyGoal': {
        data = await classifyGoal(payload.text ?? '', (p) => sendProgress('classification', p));
        break;
      }
      case 'classifyJournal': {
        data = await classifyJournalEntry(payload.text ?? '', (p) => sendProgress('classification', p));
        break;
      }
      case 'detectMood': {
        data = await detectMoodFromText(payload.text ?? '', (p) => sendProgress('classification', p));
        break;
      }
      case 'summarize': {
        data = await summarize(
          payload.text ?? '',
          payload.maxLength,
          (p) => sendProgress('summarization', p),
        );
        break;
      }
      case 'journalPreview': {
        data = await generateJournalPreview(payload.text ?? '', (p) => sendProgress('summarization', p));
        break;
      }
      case 'summarizeWeekly': {
        data = await summarizeWeeklyJournals(payload.texts ?? [], (p) => sendProgress('summarization', p));
        break;
      }
      case 'voiceProcess': {
        data = await processVoiceCheckIn(payload.text ?? '', (p) => sendProgress('voice', p));
        break;
      }
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    ctx.postMessage({ id, type: 'result', data } satisfies WorkerResultMessage);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.postMessage({ id, type: 'error', error: message } satisfies WorkerErrorMessage);
  }
});
