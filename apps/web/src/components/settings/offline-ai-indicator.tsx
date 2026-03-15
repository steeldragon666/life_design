'use client';

import { useState, useEffect } from 'react';
import { MODEL_REGISTRY } from '@life-design/ai-local';

type CacheState = 'checking' | 'cached' | 'partial' | 'not-cached';

/**
 * Shows "AI available offline" badge when all ML models are cached in IndexedDB.
 * Checks Cache API and IndexedDB for Transformers.js model files.
 */
export default function OfflineAIIndicator() {
  const [state, setState] = useState<CacheState>('checking');
  const [cachedCount, setCachedCount] = useState(0);

  useEffect(() => {
    async function checkCache() {
      if (typeof caches === 'undefined') {
        setState('not-cached');
        return;
      }

      try {
        const cacheKeys = await caches.keys();
        const modelIds = Object.values(MODEL_REGISTRY).map((m) => m.modelId);
        let found = 0;

        for (const modelId of modelIds) {
          // Transformers.js caches models by their HF model ID
          const modelName = modelId.split('/').pop() ?? modelId;
          const isCached = cacheKeys.some(
            (key) => key.includes(modelName) || key.includes('transformers'),
          );
          if (isCached) found++;
        }

        setCachedCount(found);
        if (found === modelIds.length) {
          setState('cached');
        } else if (found > 0) {
          setState('partial');
        } else {
          setState('not-cached');
        }
      } catch {
        setState('not-cached');
      }
    }

    checkCache();
  }, []);

  const totalModels = Object.keys(MODEL_REGISTRY).length;

  if (state === 'checking') return null;

  if (state === 'cached') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-sm text-emerald-400">AI available offline</span>
      </div>
    );
  }

  if (state === 'partial') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-sm text-amber-400">
          {cachedCount}/{totalModels} AI models cached
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="text-sm text-white/40">AI requires internet on first use</span>
    </div>
  );
}
