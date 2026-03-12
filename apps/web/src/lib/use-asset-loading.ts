/**
 * React Hook for Asset Loading Integration
 * Provides easy-to-use hooks for integrating the AssetLoader with React components
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AssetLoader,
  createCinematicLoader,
  createCriticalLoader,
  createAssetLoader,
  lazyLoadAsset,
  preloadAssets,
  serviceWorkerHelpers,
  type AssetLoadProgress,
  type AssetLoaderOptions,
} from './asset-loader';
import { getDeviceCapabilities, estimateBandwidth, type DeviceCapabilities } from './video-optimizer';
import { type VoiceSample } from '@/config/assets';

interface UseAssetLoadingOptions {
  autoStart?: boolean;
  priority?: AssetLoaderOptions['priority'];
  sequence?: string[];
  onProgress?: (progress: AssetLoadProgress) => void;
  onComplete?: () => void;
  onError?: (error: { assetId: string; error: Error }) => void;
}

interface UseAssetLoadingReturn {
  /** Current loading progress (0-100) */
  progress: number;
  /** Full progress state object */
  loadState: AssetLoadProgress;
  /** Whether loading is complete */
  isComplete: boolean;
  /** Whether loading is currently active */
  isLoading: boolean;
  /** Start loading assets */
  startLoading: () => void;
  /** Pause loading */
  pause: () => void;
  /** Resume loading */
  resume: () => void;
  /** Cancel loading */
  cancel: () => void;
  /** Preload a specific asset by ID */
  preloadAsset: (assetId: string) => Promise<boolean>;
  /** Preload voice samples for a voice */
  preloadVoice: (voiceId: string) => Promise<void>;
}

/**
 * Hook for managing asset loading lifecycle
 *
 * @example
 * ```tsx
 * const { progress, isComplete, startLoading } = useAssetLoading({
 *   autoStart: true,
 *   onComplete: () => console.log('All assets loaded!'),
 * });
 *
 * return <LoadingScreen progress={progress} isComplete={isComplete} />;
 * ```
 */
export function useAssetLoading(options: UseAssetLoadingOptions = {}): UseAssetLoadingReturn {
  const {
    autoStart = false,
    priority,
    sequence,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [progress, setProgress] = useState(0);
  const [loadState, setLoadState] = useState<AssetLoadProgress>({
    total: 0,
    loaded: 0,
    failed: 0,
    percent: 0,
    state: 'idle',
    errors: [],
  });
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loaderRef = useRef<ReturnType<typeof createAssetLoader> | null>(null);

  // Create loader instance
  useEffect(() => {
    loaderRef.current = createAssetLoader({
      priority,
      sequence,
      onProgress: (state) => {
        setProgress(state.percent);
        setLoadState(state);
        onProgress?.(state);
      },
      onComplete: () => {
        setIsComplete(true);
        setIsLoading(false);
        onComplete?.();
      },
      onError: (error) => {
        onError?.(error);
      },
    });

    return () => {
      loaderRef.current?.cancel();
    };
  }, [priority, sequence, onProgress, onComplete, onError]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && loaderRef.current && !isLoading && !isComplete) {
      startLoading();
    }
  }, [autoStart]);

  const startLoading = useCallback(() => {
    if (loaderRef.current && !isLoading) {
      setIsLoading(true);
      loaderRef.current.load();
    }
  }, [isLoading]);

  const pause = useCallback(() => {
    loaderRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    loaderRef.current?.resume();
  }, []);

  const cancel = useCallback(() => {
    loaderRef.current?.cancel();
    setIsLoading(false);
  }, []);

  const preloadAsset = useCallback(async (assetId: string): Promise<boolean> => {
    return loaderRef.current?.loader.preloadAsset(assetId) ?? false;
  }, []);

  const preloadVoice = useCallback(async (voiceId: string): Promise<void> => {
    // TODO: Implement voice sample preloading when voice assets are configured
    console.warn('Voice preloading not yet implemented:', voiceId);
  }, []);

  return {
    progress,
    loadState,
    isComplete,
    isLoading,
    startLoading,
    pause,
    resume,
    cancel,
    preloadAsset,
    preloadVoice,
  };
}

/**
 * Hook for cinematic opener loading (brain video first, then beach, then UI)
 *
 * @example
 * ```tsx
 * const { progress, isComplete } = useCinematicLoading({
 *   onComplete: () => setShowCinematic(true),
 * });
 * ```
 */
export function useCinematicLoading(options: Omit<UseAssetLoadingOptions, 'priority' | 'sequence'> = {}) {
  return useAssetLoading({
    ...options,
    priority: undefined,
    sequence: undefined, // Uses cinematicLoadingSequence internally
  });
}

/**
 * Hook for critical assets only (fast initial load)
 */
export function useCriticalLoading(options: Omit<UseAssetLoadingOptions, 'priority' | 'sequence'> = {}) {
  return useAssetLoading({
    ...options,
    priority: 'critical',
  });
}

/**
 * Hook for device capability detection
 *
 * @example
 * ```tsx
 * const { capabilities, isMobile, bandwidth } = useDeviceCapabilities();
 * ```
 */
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDeviceCapabilities().then((caps) => {
      setCapabilities(caps);
      setIsLoading(false);
    });
  }, []);

  const bandwidth = useMemo(() => estimateBandwidth(), []);

  return {
    capabilities,
    isLoading,
    isMobile: capabilities?.isMobile ?? false,
    isLowPower: capabilities?.isLowPower ?? false,
    supportsWebM: capabilities?.supportsWebM ?? false,
    bandwidth,
  };
}

/**
 * Hook for lazy loading assets on demand
 *
 * @example
 * ```tsx
 * const { loadAsset, isLoading, isLoaded } = useLazyAsset('goalsPathway');
 *
 * // Later...
 * await loadAsset();
 * ```
 */
export function useLazyAsset(assetId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadAsset = useCallback(async () => {
    if (isLoaded) return true;

    setIsLoading(true);
    setError(null);

    try {
      const result = await lazyLoadAsset(assetId);
      setIsLoaded(!!result);
      return !!result;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [assetId, isLoaded]);

  return { loadAsset, isLoading, isLoaded, error };
}

/**
 * Hook for preloading voice samples
 *
 * @example
 * ```tsx
 * const { preload, isPreloaded } = useVoicePreloader('sage');
 *
 * useEffect(() => {
 *   preload();
 * }, []);
 * ```
 */
export function useVoicePreloader(voiceId: string) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const preload = useCallback(async () => {
    if (isPreloaded) return;

    setIsLoading(true);
    try {
      // TODO: Implement voice sample preloading
      console.warn('Voice preloading not yet implemented:', voiceId);
      setIsPreloaded(true);
    } catch (error) {
      console.warn(`Failed to preload voice samples for ${voiceId}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [voiceId, isPreloaded]);

  const samples = useMemo(() => {
    // TODO: Implement getVoiceSamplesForVoice
    return [];
  }, [voiceId]);

  return { preload, isPreloaded, isLoading, samples };
}

/**
 * Hook for Service Worker cache status
 */
export function useSWCacheStatus(assetIds: string[]) {
  const [cacheStatus, setCacheStatus] = useState<Record<string, boolean>>({});
  const [isChecking, setIsChecking] = useState(false);

  const checkCache = useCallback(async () => {
    setIsChecking(true);
    try {
      const status = await serviceWorkerHelpers.areAssetsCached(assetIds);
      setCacheStatus(status);
    } catch (error) {
      console.warn('Failed to check cache status:', error);
    } finally {
      setIsChecking(false);
    }
  }, [assetIds]);

  const cacheAssets = useCallback(async () => {
    await serviceWorkerHelpers.cacheAssets(assetIds);
    await checkCache();
  }, [assetIds, checkCache]);

  useEffect(() => {
    checkCache();
  }, [checkCache]);

  return {
    cacheStatus,
    isChecking,
    checkCache,
    cacheAssets,
    clearCache: serviceWorkerHelpers.clearAssetCache,
  };
}

/**
 * Hook for managing the cinematic opener sequence
 * Combines asset loading with the loading screen visibility
 *
 * @example
 * ```tsx
 * const {
 *   showLoadingScreen,
 *   progress,
 *   isComplete,
 *   handleExitComplete,
 * } = useCinematicOpener({
 *   onReady: () => setShowVideo(true),
 * });
 *
 * return (
 *   <>
 *     <LoadingScreen
 *       isVisible={showLoadingScreen}
 *       progress={progress}
 *       isComplete={isComplete}
 *       onExitComplete={handleExitComplete}
 *     />
 *     {showVideo && <CinematicOpener />}
 *   </>
 * );
 * ```
 */
export function useCinematicOpener(options: {
  onReady?: () => void;
  autoStart?: boolean;
  minimumDisplayTime?: number;
} = {}) {
  const { onReady, autoStart = true, minimumDisplayTime = 2000 } = options;

  const [showLoadingScreen, setShowLoadingScreen] = useState(autoStart);
  const [showContent, setShowContent] = useState(false);
  const [hasExited, setHasExited] = useState(false);

  const { progress, isComplete, startLoading } = useCinematicLoading({
    autoStart,
    onComplete: () => {
      // Loading complete, but we wait for minimum display time in the component
    },
  });

  const handleExitComplete = useCallback(() => {
    setShowLoadingScreen(false);
    setShowContent(true);
    setHasExited(true);
    onReady?.();
  }, [onReady]);

  const skipLoading = useCallback(() => {
    setShowLoadingScreen(false);
    handleExitComplete();
  }, [handleExitComplete]);

  return {
    showLoadingScreen,
    showContent,
    progress,
    isComplete,
    hasExited,
    startLoading,
    handleExitComplete,
    skipLoading,
  };
}
