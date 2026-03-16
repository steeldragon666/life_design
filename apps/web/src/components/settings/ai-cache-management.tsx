'use client';

import { useState, useEffect, useCallback } from 'react';
import { MODEL_REGISTRY, type ModelTask } from '@life-design/ai-local';

interface CacheStatus {
  totalUsageMB: number;
  quotaMB: number;
  models: Array<{
    task: ModelTask;
    modelId: string;
    sizeMB: number;
  }>;
}

async function estimateStorageUsage(): Promise<{ usageMB: number; quotaMB: number }> {
  if (!navigator?.storage?.estimate) {
    return { usageMB: 0, quotaMB: 0 };
  }
  const estimate = await navigator.storage.estimate();
  return {
    usageMB: Math.round((estimate.usage ?? 0) / 1_048_576),
    quotaMB: Math.round((estimate.quota ?? 0) / 1_048_576),
  };
}

/**
 * Settings panel showing per-model cache status and a "Clear AI cache" button.
 * Uses navigator.storage.estimate() for storage overview.
 */
export default function AICacheManagement() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const loadStatus = useCallback(async () => {
    const { usageMB, quotaMB } = await estimateStorageUsage();
    const models = (Object.entries(MODEL_REGISTRY) as [ModelTask, { modelId: string; sizeMB: number }][]).map(
      ([task, config]) => ({
        task,
        modelId: config.modelId,
        sizeMB: config.sizeMB,
      }),
    );
    setCacheStatus({ totalUsageMB: usageMB, quotaMB, models });
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        for (const key of keys) {
          if (key.includes('transformers') || key.includes('onnx')) {
            await caches.delete(key);
          }
        }
      }
      // Also try clearing IndexedDB stores used by Transformers.js
      if (typeof indexedDB !== 'undefined') {
        const databases = await indexedDB.databases?.();
        if (databases) {
          for (const db of databases) {
            if (db.name && (db.name.includes('transformers') || db.name.includes('onnx'))) {
              indexedDB.deleteDatabase(db.name);
            }
          }
        }
      }
      setCleared(true);
      await loadStatus();
    } finally {
      setIsClearing(false);
    }
  };

  if (!cacheStatus) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm text-white/40">Loading cache status...</p>
      </div>
    );
  }

  const totalModelSizeMB = cacheStatus.models.reduce((sum, m) => sum + m.sizeMB, 0);

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">AI Model Cache</h3>
        <span className="text-xs text-white/40">
          {cacheStatus.totalUsageMB} MB / {cacheStatus.quotaMB} MB used
        </span>
      </div>

      <div className="space-y-2">
        {cacheStatus.models.map((model) => (
          <div
            key={model.task}
            className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-white/70 capitalize">{model.task}</p>
              <p className="text-xs text-white/30">{model.modelId}</p>
            </div>
            <span className="text-xs text-white/40">{model.sizeMB} MB</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-xs text-white/40">
          Total model size: ~{totalModelSizeMB} MB
        </span>
        <button
          type="button"
          disabled={isClearing}
          onClick={handleClearCache}
          className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {isClearing ? 'Clearing...' : cleared ? 'Cache cleared' : 'Clear AI cache'}
        </button>
      </div>
    </div>
  );
}
