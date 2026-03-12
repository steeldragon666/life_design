/**
 * Asset Loading System - Barrel Exports
 *
 * This module provides a comprehensive asset loading and optimization system
 * for the Life Design cinematic experience.
 *
 * Quick Start:
 * ```tsx
 * import {
 *   useCinematicOpener,
 *   LoadingScreen,
 * } from '@/components/loading';
 *
 * function App() {
 *   const { showLoadingScreen, progress, isComplete, handleExitComplete } = useCinematicOpener({
 *     onReady: () => console.log('Ready!'),
 *   });
 *
 *   return (
 *     <LoadingScreen
 *       isVisible={showLoadingScreen}
 *       progress={progress}
 *       isComplete={isComplete}
 *       onExitComplete={handleExitComplete}
 *     />
 *   );
 * }
 * ```
 */

// Asset Configuration
export {
  // Assets
  videoAssets,
  imageAssets,
  voiceSamples,
  loadingMessages,
  cinematicLoadingSequence,
  criticalAssets,
  swCacheConfig,
  // Functions
  getVoiceSamplesForVoice,
  getOptimalVariant,
  getAssetById,
  getAllAssets,
  getAssetsByPriority,
} from '@/config/assets';

export type {
  VideoQuality,
  AssetType,
  AssetPriority,
  AssetVariant,
  AssetDefinition,
  VoiceSample,
} from '@/config/assets';

// Video Optimization
export {
  detectCodecSupport,
  getDeviceCapabilities,
  estimateBandwidth,
  measureActualSpeed,
  selectOptimalQuality,
  getOptimizedVideoVariant,
  preloadOptimizedVideo,
  loadVideoProgressively,
  createMobileOptimizedVideo,
  getEstimatedFileSize,
  getVideoSettingsForDevice,
  clearCaches as clearVideoCaches,
} from './video-optimizer';

export type {
  DeviceCapabilities,
  BandwidthEstimate,
  VideoOptimizationOptions,
} from './video-optimizer';

// Asset Loader
export {
  AssetLoader,
  createCinematicLoader,
  createCriticalLoader,
  createAssetLoader,
  lazyLoadAsset,
  preloadAssets,
  serviceWorkerHelpers,
} from './asset-loader';

export type {
  LoadingState,
  AssetLoadProgress,
  AssetLoadError,
  AssetCacheEntry,
  ProgressCallback,
  CompleteCallback,
  ErrorCallback,
  AssetLoaderOptions,
} from './asset-loader';

// React Hooks
export {
  useAssetLoading,
  useCinematicLoading,
  useCriticalLoading,
  useDeviceCapabilities,
  useLazyAsset,
  useVoicePreloader,
  useSWCacheStatus,
  useCinematicOpener,
} from './use-asset-loading';
