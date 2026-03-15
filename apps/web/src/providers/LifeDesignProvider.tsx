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
import { AILocalClient, type AILocalProgress } from '@life-design/ai-local';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface LifeDesignContextValue {
  db: LifeDesignDB;
  analysisPipeline: AnalysisPipeline;
  nudgeScheduler: NudgeScheduler;
  challengeEngine: ChallengeEngine;
  badgeSystem: BadgeSystem;
  aiLocal: AILocalClient;
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

  const handleProgress = useCallback((p: AILocalProgress) => {
    if (p.progress !== undefined) setAiProgress(p.progress);
    if (p.status === 'ready') setAiReady(true);
  }, []);

  // Engine instances are created once and never replaced — stable reference.
  const [engines] = useState<Omit<LifeDesignContextValue, 'aiReady' | 'aiProgress'>>(() => {
    const badgeSystem = new BadgeSystem(db);
    const challengeEngine = new ChallengeEngine(db);
    const nudgeScheduler = new NudgeScheduler(db);
    const aiLocal = new AILocalClient({ onProgress: handleProgress });
    const analysisPipeline = new AnalysisPipeline(db, aiLocal, badgeSystem);
    return { db, analysisPipeline, nudgeScheduler, challengeEngine, badgeSystem, aiLocal };
  });

  // Start nudge scheduler on mount and preload AI model (non-blocking).
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    engines.nudgeScheduler.start();
    // Trigger model warm-up by embedding an empty string; success marks AI ready.
    engines.aiLocal.embed('').then(() => setAiReady(true)).catch(() => {
      // AI unavailable or in SSR — remain in not-ready state.
    });

    return () => {
      engines.nudgeScheduler.stop();
      engines.aiLocal.dispose();
    };
  }, [engines]);

  const contextValue: LifeDesignContextValue = { ...engines, aiReady, aiProgress };

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
