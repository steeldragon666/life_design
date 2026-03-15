/**
 * React hook for client-side ML inference via @life-design/ai-local.
 * Spawns an AILocalClient (Web Worker) on first method call, disposes on unmount.
 *
 * Summarization is opt-in (enableSummarization: true) because the model
 * is ~110MB. Embedding and classification load smaller models (~23-25MB).
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AILocalClient, type AILocalProgress, type DimensionLabel } from '@life-design/ai-local';

interface UseAILocalOptions {
  /** Enable the 110MB summarization model. Defaults to false (opt-in). */
  enableSummarization?: boolean;
}

interface UseAILocalReturn {
  /** Compute a 384-dim embedding vector for text */
  embed: (text: string) => Promise<Float32Array>;
  /** Classify text against the 8 life dimensions */
  classify: (text: string) => Promise<Record<DimensionLabel, number>>;
  /** Produce an abstractive summary (requires enableSummarization: true) */
  summarize: (text: string, maxLength?: number) => Promise<string>;
  /** Whether a model is currently loading */
  isLoading: boolean;
  /** Whether at least one inference has completed (client is warm) */
  isReady: boolean;
  /** Last error, if any */
  error: Error | null;
  /** Latest progress event from model download */
  progress: AILocalProgress | null;
  /** Whether summarization is enabled */
  isSummarizationEnabled: boolean;
}

export function useAILocal(options?: UseAILocalOptions): UseAILocalReturn {
  const { enableSummarization = false } = options ?? {};
  const clientRef = useRef<AILocalClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<AILocalProgress | null>(null);

  // Lazily create the client on first use
  const getClient = useCallback(() => {
    // SSR guard — return null during server rendering
    if (typeof window === 'undefined') return null;

    if (!clientRef.current) {
      clientRef.current = new AILocalClient({
        onProgress: (p) => {
          setProgress(p);
          if (p.status === 'progress') {
            setIsLoading(true);
          }
        },
      });
    }
    return clientRef.current;
  }, []);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  const embed = useCallback(async (text: string): Promise<Float32Array> => {
    const client = getClient();
    if (!client) throw new Error('AI not available in this environment');
    setError(null);
    setIsLoading(true);
    try {
      const result = await client.embed(text);
      setIsReady(true);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  const classify = useCallback(async (text: string): Promise<Record<DimensionLabel, number>> => {
    const client = getClient();
    if (!client) throw new Error('AI not available in this environment');
    setError(null);
    setIsLoading(true);
    try {
      const result = await client.classify(text);
      setIsReady(true);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  const summarize = useCallback(async (text: string, maxLength?: number): Promise<string> => {
    if (!enableSummarization) {
      throw new Error('Summarization not enabled. Pass { enableSummarization: true } to useAILocal().');
    }
    const client = getClient();
    if (!client) throw new Error('AI not available in this environment');
    setError(null);
    setIsLoading(true);
    try {
      const result = await client.summarize(text, maxLength);
      setIsReady(true);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getClient, enableSummarization]);

  return {
    embed,
    classify,
    summarize,
    isLoading,
    isReady,
    error,
    progress,
    isSummarizationEnabled: enableSummarization,
  };
}
