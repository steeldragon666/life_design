'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { db } from '@/lib/db';
import type { LifeDesignDB } from '@/lib/db/schema';
import { AnalysisPipeline } from '@/lib/analysis/analysis-pipeline';
import { NudgeScheduler } from '@/lib/nudge/nudge-scheduler';
import { ChallengeEngine } from '@/lib/challenges/challenge-engine';
import { BadgeSystem } from '@/lib/achievements/badge-system';

// Type-only import to avoid pulling Transformers.js into the client bundle.
// AILocalClient is loaded dynamically at runtime.
import type { AILocalClient, AILocalProgress } from '@life-design/ai-local';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface LifeDesignContextValue {
  db: LifeDesignDB;
  analysisPipeline: AnalysisPipeline;
  nudgeScheduler: NudgeScheduler;
  challengeEngine: ChallengeEngine;
  badgeSystem: BadgeSystem;
  aiLocal: AILocalClient | null;
  aiReady: boolean;
  aiProgress: number;
}

const LifeDesignContext = createContext<LifeDesignContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LifeDesignProvider({ children }: { children: ReactNode }) {
  const [aiReady, setAiReady] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLocal, setAiLocal] = useState<AILocalClient | null>(null);

  const handleProgress = useCallback((p: AILocalProgress) => {
    if (p.progress !== undefined) setAiProgress(p.progress);
    if (p.status === 'ready') setAiReady(true);
  }, []);

  // Non-AI engine instances are created once — stable reference.
  const [engines] = useState(() => {
    const badgeSystem = new BadgeSystem(db);
    const challengeEngine = new ChallengeEngine(db);
    const nudgeScheduler = new NudgeScheduler(db);
    return { db, nudgeScheduler, challengeEngine, badgeSystem };
  });

  // Lazily create AnalysisPipeline once aiLocal is ready.
  const [analysisPipeline, setAnalysisPipeline] = useState<AnalysisPipeline>(
    () => new AnalysisPipeline(db, null, engines.badgeSystem),
  );

  // Dynamic import of AILocalClient to avoid bundling Transformers.js/onnxruntime-node.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    engines.nudgeScheduler.start();

    import('@life-design/ai-local').then(({ AILocalClient: Client }) => {
      const client = new Client({ onProgress: handleProgress });
      setAiLocal(client);
      setAnalysisPipeline(new AnalysisPipeline(db, client, engines.badgeSystem));
      // Warm up model.
      client.embed('').then(() => setAiReady(true)).catch(() => {});
    }).catch(() => {
      // AI unavailable — remain in not-ready state.
    });

    return () => {
      engines.nudgeScheduler.stop();
    };
  }, [engines, handleProgress]);

  // Dispose aiLocal on unmount.
  useEffect(() => {
    return () => {
      aiLocal?.dispose();
    };
  }, [aiLocal]);

  const contextValue: LifeDesignContextValue = {
    ...engines,
    analysisPipeline,
    aiLocal,
    aiReady,
    aiProgress,
  };

  return (
    <LifeDesignContext.Provider value={contextValue}>
      {children}
    </LifeDesignContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useLifeDesignContext(hookName: string): LifeDesignContextValue {
  const ctx = useContext(LifeDesignContext);
  if (!ctx) {
    throw new Error(`${hookName} must be used inside LifeDesignProvider`);
  }
  return ctx;
}

export function useAnalysisPipeline(): AnalysisPipeline {
  return useLifeDesignContext('useAnalysisPipeline').analysisPipeline;
}

export function useNudges(): NudgeScheduler {
  return useLifeDesignContext('useNudges').nudgeScheduler;
}

export function useChallenges(): ChallengeEngine {
  return useLifeDesignContext('useChallenges').challengeEngine;
}

export function useBadges(): BadgeSystem {
  return useLifeDesignContext('useBadges').badgeSystem;
}

export function useAIStatus(): { ready: boolean; progress: number } {
  const ctx = useLifeDesignContext('useAIStatus');
  return { ready: ctx.aiReady, progress: ctx.aiProgress };
}
