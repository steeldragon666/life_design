/**
 * Asset Loader System
 * Preloads videos, images, and audio in sequence with priority loading
 * Provides progress callbacks, error handling, and cache management
 */

import type {
  AssetDefinition,
  AssetVariant,
  AssetType,
  AssetPriority,
  VoiceSample,
} from '@/config/assets';
import {
  videoAssets,
  imageAssets,
  voiceSamples,
  cinematicLoadingSequence,
  criticalAssets,
  getAssetById,
  getOptimalVariant,
} from '@/config/assets';
import {
  getDeviceCapabilities,
  getOptimizedVideoVariant,
  preloadOptimizedVideo,
  loadVideoProgressively,
  estimateBandwidth,
  type VideoOptimizationOptions,
} from './video-optimizer';

// Loading state types
export type LoadingState = 'idle' | 'loading' | 'paused' | 'complete' | 'error';

export interface AssetLoadProgress {
  total: number;
  loaded: number;
  failed: number;
  percent: number;
  currentAsset?: string;
  state: LoadingState;
  errors: AssetLoadError[];
}

export interface AssetLoadError {
  assetId: string;
  error: Error;
  fallbackUsed?: boolean;
}

export interface AssetCacheEntry {
  asset: AssetDefinition;
  variant: AssetVariant;
  element?: HTMLVideoElement | HTMLImageElement | HTMLAudioElement;
  blobUrl?: string;
  loadedAt: number;
  lastAccessed: number;
  accessCount: number;
}

// Callback types
export type ProgressCallback = (progress: AssetLoadProgress) => void;
export type CompleteCallback = () => void;
export type ErrorCallback = (error: AssetLoadError) => void;

// Asset Loader Options
export interface AssetLoaderOptions {
  priority?: AssetPriority;
  sequence?: string[]; // Asset IDs to load in order
  parallel?: boolean; // Load in parallel vs sequential
  progressive?: boolean; // Show first frame while loading
  timeout?: number; // Per-asset timeout in ms
  retryCount?: number; // Number of retries on failure
  onProgress?: ProgressCallback;
  onComplete?: CompleteCallback;
  onError?: ErrorCallback;
  videoOptions?: VideoOptimizationOptions;
}

// Default options
const defaultOptions: Required<Omit<AssetLoaderOptions, 'onProgress' | 'onComplete' | 'onError'>> = {
  priority: 'critical',
  sequence: [],
  parallel: false,
  progressive: true,
  timeout: 30000,
  retryCount: 2,
  videoOptions: {},
};

/**
 * AssetLoader Class
 * Manages preloading of all asset types with priority queuing
 */
export class AssetLoader {
  private cache = new Map<string, AssetCacheEntry>();
  private loadingQueue: AssetDefinition[] = [];
  private isLoading = false;
  private abortController: AbortController | null = null;
  private progress: AssetLoadProgress = {
    total: 0,
    loaded: 0,
    failed: 0,
    percent: 0,
    state: 'idle',
    errors: [],
  };
  private options: Required<AssetLoaderOptions>;

  constructor(options: AssetLoaderOptions = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Initialize and start loading assets
   */
  async load(): Promise<void> {
    if (this.isLoading) {
      console.warn('AssetLoader: Already loading');
      return;
    }

    this.isLoading = true;
    this.progress.state = 'loading';
    this.abortController = new AbortController();

    try {
      // Build loading queue based on priority or sequence
      this.loadingQueue = this.buildLoadingQueue();
      this.progress.total = this.loadingQueue.length;

      // Get device capabilities once for optimization
      await getDeviceCapabilities();

      if (this.options.parallel) {
        await this.loadParallel();
      } else {
        await this.loadSequential();
      }

      this.progress.state = this.progress.failed > 0 ? 'error' : 'complete';
      this.options.onComplete?.();
    } catch (error) {
      this.progress.state = 'error';
      console.error('AssetLoader: Critical error during loading', error);
    } finally {
      this.isLoading = false;
      this.abortController = null;
    }
  }

  /**
   * Pause loading
   */
  pause(): void {
    if (this.isLoading) {
      this.progress.state = 'paused';
      // AbortController will cancel in-flight requests
      this.abortController?.abort();
    }
  }

  /**
   * Resume loading
   */
  resume(): void {
    if (this.progress.state === 'paused') {
      this.load();
    }
  }

  /**
   * Cancel all loading
   */
  cancel(): void {
    this.abortController?.abort();
    this.isLoading = false;
    this.progress.state = 'idle';
    this.loadingQueue = [];
  }

  /**
   * Get current loading progress
   */
  getProgress(): AssetLoadProgress {
    return { ...this.progress };
  }

  /**
   * Check if an asset is cached
   */
  isCached(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  /**
   * Get cached asset entry
   */
  getCachedAsset(assetId: string): AssetCacheEntry | undefined {
    const entry = this.cache.get(assetId);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
    }
    return entry;
  }

  /**
   * Preload a single asset by ID
   */
  async preloadAsset(assetId: string): Promise<boolean> {
    const asset = getAssetById(assetId);
    if (!asset) {
      console.warn(`AssetLoader: Unknown asset ID "${assetId}"`);
      return false;
    }

    return this.loadSingleAsset(asset);
  }

  /**
   * Preload voice samples for a specific voice
   */
  async preloadVoiceSamples(voiceId: string): Promise<void> {
    const samples = voiceSamples.filter(s => s.voiceId === voiceId);

    const loadPromises = samples.map(async (sample) => {
      try {
        const audio = await this.loadAudio(sample.url);
        this.cache.set(`voice-${sample.id}`, {
          asset: {
            id: `voice-${sample.id}`,
            type: 'audio',
            priority: 'medium',
            variants: [{ quality: 'high', url: sample.url, bandwidth: 0, resolution: '', fileSize: 0 }],
            preload: true,
          },
          variant: { quality: 'high', url: sample.url, bandwidth: 0, resolution: '', fileSize: 0 },
          element: audio,
          loadedAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 0,
        });
      } catch (error) {
        console.warn(`Failed to preload voice sample: ${sample.id}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Get memory usage statistics
   */
  getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    videoCount: number;
    imageCount: number;
    audioCount: number;
  } {
    let totalSize = 0;
    let videoCount = 0;
    let imageCount = 0;
    let audioCount = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.variant.fileSize;
      switch (entry.asset.type) {
        case 'video':
          videoCount++;
          break;
        case 'image':
          imageCount++;
          break;
        case 'audio':
          audioCount++;
          break;
      }
    }

    return {
      totalEntries: this.cache.size,
      totalSize,
      videoCount,
      imageCount,
      audioCount,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    // Revoke blob URLs
    for (const entry of this.cache.values()) {
      if (entry.blobUrl) {
        URL.revokeObjectURL(entry.blobUrl);
      }
    }
    this.cache.clear();
  }

  /**
   * Build the loading queue based on priority or sequence
   */
  private buildLoadingQueue(): AssetDefinition[] {
    const { priority, sequence } = this.options;

    // If sequence is provided, load in that order
    if (sequence.length > 0) {
      const queue: AssetDefinition[] = [];
      for (const id of sequence) {
        const asset = getAssetById(id);
        if (asset && asset.preload) {
          queue.push(asset);
        }
      }
      return queue;
    }

    // Otherwise load by priority
    const allAssets = [
      ...Object.values(videoAssets),
      ...Object.values(imageAssets),
    ];

    const priorityOrder: AssetPriority[] = ['critical', 'high', 'medium', 'low'];
    const priorityIndex = priorityOrder.indexOf(priority);

    return allAssets
      .filter(asset => asset.preload)
      .filter(asset => {
        const assetPriorityIndex = priorityOrder.indexOf(asset.priority);
        return assetPriorityIndex <= priorityIndex;
      })
      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  }

  /**
   * Load assets sequentially
   */
  private async loadSequential(): Promise<void> {
    for (const asset of this.loadingQueue) {
      if (this.abortController?.signal.aborted) {
        break;
      }

      this.progress.currentAsset = asset.id;
      this.notifyProgress();

      const success = await this.loadSingleAsset(asset);

      if (success) {
        this.progress.loaded++;
      } else {
        this.progress.failed++;
      }

      this.progress.percent = Math.round((this.progress.loaded / this.progress.total) * 100);
      this.notifyProgress();
    }
  }

  /**
   * Load assets in parallel
   */
  private async loadParallel(): Promise<void> {
    const loadPromises = this.loadingQueue.map(async (asset) => {
      const success = await this.loadSingleAsset(asset);
      this.progress.loaded += success ? 1 : 0;
      this.progress.failed += success ? 0 : 1;
      this.progress.percent = Math.round((this.progress.loaded / this.progress.total) * 100);
      this.notifyProgress();
    });

    await Promise.all(loadPromises);
  }

  /**
   * Load a single asset with retries
   */
  private async loadSingleAsset(asset: AssetDefinition, retryAttempt = 0): Promise<boolean> {
    // Check if already cached
    if (this.cache.has(asset.id)) {
      return true;
    }

    try {
      const variant = await this.selectVariant(asset);
      if (!variant) {
        throw new Error('No compatible variant found');
      }

      let element: HTMLVideoElement | HTMLImageElement | HTMLAudioElement | undefined;

      switch (asset.type) {
        case 'video':
          element = await this.loadVideo(asset, variant);
          break;
        case 'image':
          element = await this.loadImage(variant);
          break;
        case 'audio':
          element = await this.loadAudio(variant.url);
          break;
        default:
          throw new Error(`Unknown asset type: ${asset.type}`);
      }

      // Cache the loaded asset
      this.cache.set(asset.id, {
        asset,
        variant,
        element,
        loadedAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
      });

      return true;
    } catch (error) {
      console.warn(`Failed to load asset "${asset.id}" (attempt ${retryAttempt + 1}):`, error);

      // Retry if applicable
      if (retryAttempt < this.options.retryCount) {
        await this.delay(1000 * (retryAttempt + 1)); // Exponential backoff
        return this.loadSingleAsset(asset, retryAttempt + 1);
      }

      // Try fallback if available
      if (asset.fallback) {
        try {
          const fallbackElement = await this.loadFallback(asset);
          if (fallbackElement) {
            const fallbackVariant: AssetVariant = {
              quality: 'low',
              url: asset.fallback,
              bandwidth: 0,
              resolution: '',
              fileSize: 0,
            };
            this.cache.set(asset.id, {
              asset,
              variant: fallbackVariant,
              element: fallbackElement,
              loadedAt: Date.now(),
              lastAccessed: Date.now(),
              accessCount: 0,
            });

            this.progress.errors.push({
              assetId: asset.id,
              error: error as Error,
              fallbackUsed: true,
            });
            this.options.onError?.({
              assetId: asset.id,
              error: error as Error,
              fallbackUsed: true,
            });

            return true;
          }
        } catch (fallbackError) {
          console.error(`Fallback also failed for "${asset.id}":`, fallbackError);
        }
      }

      // Log error
      this.progress.errors.push({
        assetId: asset.id,
        error: error as Error,
      });
      this.options.onError?.({
        assetId: asset.id,
        error: error as Error,
      });

      return false;
    }
  }

  /**
   * Select optimal variant for asset
   */
  private async selectVariant(asset: AssetDefinition): Promise<AssetVariant | null> {
    if (asset.type === 'video') {
      return getOptimizedVideoVariant(asset, this.options.videoOptions);
    }

    const bandwidth = estimateBandwidth().downlink;
    const capabilities = await getDeviceCapabilities();
    return getOptimalVariant(asset, bandwidth, capabilities.supportsWebM);
  }

  /**
   * Load a video asset
   */
  private async loadVideo(asset: AssetDefinition, variant: AssetVariant): Promise<HTMLVideoElement> {
    if (this.options.progressive) {
      return new Promise((resolve, reject) => {
        loadVideoProgressively(
          asset,
          () => {
            // First frame loaded - could show preview
            console.log(`First frame loaded for ${asset.id}`);
          },
          () => {
            // Fully buffered
            resolve;
          },
          this.options.videoOptions
        ).then(video => {
          if (video) {
            resolve(video);
          } else {
            reject(new Error('Video load returned null'));
          }
        }).catch(reject);
      });
    }

    const video = await preloadOptimizedVideo(asset, this.options.videoOptions);
    if (!video) {
      throw new Error('Failed to preload video');
    }
    return video;
  }

  /**
   * Load an image asset
   */
  private async loadImage(variant: AssetVariant): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout: ${variant.url}`));
      }, this.options.timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load image: ${variant.url}`));
      };

      img.crossOrigin = 'anonymous';
      img.src = variant.url;
    });
  }

  /**
   * Load an audio asset
   */
  private async loadAudio(url: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Audio load timeout: ${url}`));
      }, this.options.timeout);

      audio.oncanplaythrough = () => {
        clearTimeout(timeoutId);
        resolve(audio);
      };

      audio.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load audio: ${url}`));
      };

      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.src = url;
    });
  }

  /**
   * Load fallback image
   */
  private async loadFallback(asset: AssetDefinition): Promise<HTMLImageElement | null> {
    if (!asset.fallback) return null;

    try {
      const img = await this.loadImage({
        quality: 'low',
        url: asset.fallback,
        bandwidth: 0,
        resolution: '',
        fileSize: 0,
      });
      return img;
    } catch {
      return null;
    }
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(): void {
    this.options.onProgress?.({ ...this.progress });
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a preconfigured AssetLoader for the cinematic opener
 */
export function createCinematicLoader(
  onProgress?: ProgressCallback,
  onComplete?: CompleteCallback,
  onError?: ErrorCallback
): AssetLoader {
  return new AssetLoader({
    sequence: cinematicLoadingSequence,
    parallel: false, // Sequential for priority loading
    progressive: true,
    onProgress,
    onComplete,
    onError,
  });
}

/**
 * Create a loader for critical assets only
 */
export function createCriticalLoader(
  onProgress?: ProgressCallback,
  onComplete?: CompleteCallback
): AssetLoader {
  return new AssetLoader({
    priority: 'critical',
    parallel: true, // Load critical assets in parallel
    onProgress,
    onComplete,
  });
}

/**
 * Lazy load an asset on demand
 */
export async function lazyLoadAsset(assetId: string): Promise<AssetCacheEntry | null> {
  const asset = getAssetById(assetId);
  if (!asset) return null;

  const loader = new AssetLoader({
    parallel: false,
    progressive: false,
  });

  const success = await loader.preloadAsset(assetId);
  if (success) {
    return loader.getCachedAsset(assetId) || null;
  }
  return null;
}

/**
 * Preload multiple assets by ID
 */
export async function preloadAssets(
  assetIds: string[],
  onProgress?: ProgressCallback
): Promise<{ loaded: string[]; failed: string[] }> {
  const results = { loaded: [] as string[], failed: [] as string[] };

  const loader = new AssetLoader({
    parallel: true,
    onProgress,
  });

  for (const id of assetIds) {
    const success = await loader.preloadAsset(id);
    if (success) {
      results.loaded.push(id);
    } else {
      results.failed.push(id);
    }
  }

  return results;
}

/**
 * Service Worker integration helpers
 */
export const serviceWorkerHelpers = {
  /**
   * Cache assets using Service Worker
   */
  async cacheAssets(assetIds: string[]): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;

    // Send message to SW to cache specific assets
    registration.active?.postMessage({
      type: 'CACHE_ASSETS',
      payload: { assetIds },
    });
  },

  /**
   * Check if assets are cached
   */
  async areAssetsCached(assetIds: string[]): Promise<Record<string, boolean>> {
    if (!('serviceWorker' in navigator)) {
      return assetIds.reduce((acc, id) => ({ ...acc, [id]: false }), {});
    }

    return new Promise((resolve) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        resolve(event.data.cached || {});
      };

      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage(
          { type: 'CHECK_CACHE', payload: { assetIds } },
          [channel.port2]
        );
      });
    });
  },

  /**
   * Clear asset cache
   */
  async clearAssetCache(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CLEAR_CACHE' });
  },
};

/**
 * React hook compatible loader instance
 * Returns methods to control loading
 */
export function createAssetLoader(
  options: AssetLoaderOptions = {}
): {
  loader: AssetLoader;
  load: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  getProgress: () => AssetLoadProgress;
} {
  const loader = new AssetLoader(options);

  return {
    loader,
    load: () => loader.load(),
    pause: () => loader.pause(),
    resume: () => loader.resume(),
    cancel: () => loader.cancel(),
    getProgress: () => loader.getProgress(),
  };
}
