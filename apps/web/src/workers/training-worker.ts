/**
 * Web Worker entry point for ML training and prediction.
 *
 * All training and inference runs here, off the main thread.
 * Uses navigator.locks (where available) to serialise training
 * operations across tabs.
 *
 * Communication protocol:
 *   Main → Worker: { id, type: 'train'|'predict'|'getModelInfo', payload }
 *   Worker → Main: { id, type: 'result', data } | { id, type: 'error', error }
 */

import { LocalTrainer } from '../lib/ml/trainer';
import type {
  NormalisedMLFeatures,
  TrainingPair,
  ModelWeightsRecord,
  PredictionResult,
} from '../lib/ml/types';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type TrainerMessageType = 'train' | 'predict' | 'getModelInfo';

export interface TrainerRequest {
  id: string;
  type: TrainerMessageType;
  payload: {
    features?: NormalisedMLFeatures;
    pairs?: TrainingPair[];
  };
}

export interface TrainerResultMessage {
  id: string;
  type: 'result';
  data: unknown;
}

export interface TrainerErrorMessage {
  id: string;
  type: 'error';
  error: string;
}

export type TrainerResponse = TrainerResultMessage | TrainerErrorMessage;

// ---------------------------------------------------------------------------
// Worker setup
// ---------------------------------------------------------------------------

const ctx = self as unknown as Worker;
const trainer = new LocalTrainer();

ctx.addEventListener(
  'message',
  async (event: MessageEvent<TrainerRequest>) => {
    const { id, type, payload } = event.data;

    try {
      let data: unknown;

      switch (type) {
        case 'predict': {
          if (!payload.features) throw new Error('Missing features');
          data = await trainer.predict(payload.features);
          break;
        }
        case 'train': {
          if (!payload.pairs) throw new Error('Missing training pairs');
          // Use Web Locks API (where available) to serialise training across tabs
          if (typeof navigator !== 'undefined' && navigator.locks) {
            data = await navigator.locks.request(
              'life-design-training',
              async () => trainer.train(payload.pairs!),
            );
          } else {
            data = await trainer.train(payload.pairs);
          }
          break;
        }
        case 'getModelInfo': {
          data = trainer.getModelInfo();
          break;
        }
        default:
          throw new Error(`Unknown type: ${type}`);
      }

      ctx.postMessage({
        id,
        type: 'result',
        data,
      } satisfies TrainerResultMessage);
    } catch (err) {
      ctx.postMessage({
        id,
        type: 'error',
        error: err instanceof Error ? err.message : String(err),
      } satisfies TrainerErrorMessage);
    }
  },
);
