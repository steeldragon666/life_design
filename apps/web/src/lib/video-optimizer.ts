/**
 * Video Optimizer Utility
 * Detects device capabilities, bandwidth, and selects optimal video format/quality
 */

import type { VideoQuality, AssetDefinition, AssetVariant } from '@/config/assets';
import { getOptimalVariant } from '@/config/assets';

// Device capability detection
export interface DeviceCapabilities {
  supportsWebM: boolean;
  supportsH264: boolean;
  supportsH265: boolean;
  supportsAV1: boolean;
  maxResolution: number;
  isMobile: boolean;
  isLowPower: boolean;
  connectionType: string;
  saveData: boolean;
  deviceMemory?: number; // GB
  hardwareConcurrency: number;
}

// Bandwidth estimation
export interface BandwidthEstimate {
  downlink: number; // Mbps
  rtt: number; // Round-trip time in ms
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | '5g';
  isMetered: boolean;
}

// Video optimization options
export interface VideoOptimizationOptions {
  preferWebM?: boolean;
  maxQuality?: VideoQuality;
  allowMobileHD?: boolean;
  forceLowQuality?: boolean;
}

// Cached device capabilities
let cachedCapabilities: DeviceCapabilities | null = null;
let cachedBandwidth: BandwidthEstimate | null = null;

/**
 * Detect video codec support using MediaCapabilities API
 */
export async function detectCodecSupport(): Promise<{
  webm: boolean;
  h264: boolean;
  h265: boolean;
  av1: boolean;
}> {
  // Default to basic support
  const support = {
    webm: false,
    h264: false,
    h265: false,
    av1: false,
  };

  // Check basic canPlayType support
  const testVideo = document.createElement('video');
  support.webm = testVideo.canPlayType('video/webm; codecs="vp9"') !== '';
  support.h264 = testVideo.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
  support.h265 = testVideo.canPlayType('video/mp4; codecs="hev1"') !== '';
  support.av1 = testVideo.canPlayType('video/webm; codecs="av01"') !== '';

  // Use MediaCapabilities API for more detailed info if available
  if ('mediaCapabilities' in navigator) {
    const mediaCapabilities = navigator.mediaCapabilities as MediaCapabilities;

    try {
      // Test WebM VP9
      const webmConfig = {
        type: 'file' as const,
        video: {
          contentType: 'video/webm; codecs="vp9"',
          width: 1920,
          height: 1080,
          bitrate: 5000000,
          framerate: 30,
        },
      };
      const webmInfo = await mediaCapabilities.decodingInfo(webmConfig);
      support.webm = webmInfo.supported;

      // Test H.264
      const h264Config = {
        type: 'file' as const,
        video: {
          contentType: 'video/mp4; codecs="avc1.42E01E"',
          width: 1920,
          height: 1080,
          bitrate: 5000000,
          framerate: 30,
        },
      };
      const h264Info = await mediaCapabilities.decodingInfo(h264Config);
      support.h264 = h264Info.supported;
    } catch {
      // Fallback to canPlayType results
    }
  }

  return support;
}

/**
 * Get device screen capabilities
 */
function getScreenCapabilities(): {
  maxResolution: number;
  dpr: number;
  isMobile: boolean;
} {
  const width = window.screen.width;
  const height = window.screen.height;
  const dpr = window.devicePixelRatio || 1;
  const maxResolution = Math.max(width, height) * dpr;

  // Detect mobile/tablet
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (width < 768);

  return { maxResolution, dpr, isMobile };
}

/**
 * Detect if device is low-power (e.g., older mobile devices)
 */
function detectLowPowerDevice(): boolean {
  const memory = (navigator as Navigator).deviceMemory;
  const cores = navigator.hardwareConcurrency || 2;
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Low memory devices or devices with few cores
  if (memory && memory <= 4) return true;
  if (cores <= 2) return true;

  // Specific device detection for known low-power devices
  const ua = navigator.userAgent;
  if (isMobile) {
    // Older iPhones
    if (/iPhone OS (9|10|11|12)_/i.test(ua)) return true;
    // Older Android
    if (/Android [4-7]\./i.test(ua)) return true;
  }

  return false;
}

/**
 * Get network connection info
 */
function getConnectionInfo(): {
  type: string;
  saveData: boolean;
  downlink?: number;
  rtt?: number;
  effectiveType?: string;
} {
  const connection = (navigator as Navigator).connection ||
    (navigator as Navigator).mozConnection ||
    (navigator as Navigator).webkitConnection;

  if (connection) {
    return {
      type: connection.type || 'unknown',
      saveData: connection.saveData || false,
      downlink: connection.downlink,
      rtt: connection.rtt,
      effectiveType: connection.effectiveType,
    };
  }

  return {
    type: 'unknown',
    saveData: false,
  };
}

/**
 * Get comprehensive device capabilities
 */
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const codecSupport = await detectCodecSupport();
  const screen = getScreenCapabilities();
  const connection = getConnectionInfo();
  const isLowPower = detectLowPowerDevice();
  const deviceMemory = (navigator as Navigator).deviceMemory;

  cachedCapabilities = {
    supportsWebM: codecSupport.webm,
    supportsH264: codecSupport.h264,
    supportsH265: codecSupport.h265,
    supportsAV1: codecSupport.av1,
    maxResolution: screen.maxResolution,
    isMobile: screen.isMobile,
    isLowPower,
    connectionType: connection.type,
    saveData: connection.saveData,
    deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency || 2,
  };

  return cachedCapabilities;
}

/**
 * Estimate current bandwidth
 */
export function estimateBandwidth(): BandwidthEstimate {
  if (cachedBandwidth && Date.now() - (cachedBandwidth as unknown as { timestamp: number }).timestamp < 30000) {
    return cachedBandwidth;
  }

  const connection = (navigator as Navigator).connection ||
    (navigator as Navigator).mozConnection ||
    (navigator as Navigator).webkitConnection;

  const estimate: BandwidthEstimate = {
    downlink: connection?.downlink || 10,
    rtt: connection?.rtt || 50,
    effectiveType: (connection?.effectiveType as BandwidthEstimate['effectiveType']) || '4g',
    isMetered: connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g',
  };

  // Store with timestamp
  (estimate as unknown as { timestamp: number }).timestamp = Date.now();
  cachedBandwidth = estimate;

  return estimate;
}

/**
 * Measure actual download speed using a small test file
 */
export async function measureActualSpeed(testUrl: string, fileSize: number): Promise<number> {
  const startTime = performance.now();

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // seconds
    const bitsLoaded = fileSize * 8;
    const speedMbps = (bitsLoaded / duration) / 1_000_000;

    return speedMbps;
  } catch (error) {
    console.warn('Speed measurement failed:', error);
    return estimateBandwidth().downlink;
  }
}

/**
 * Select optimal video quality based on device and network
 */
export function selectOptimalQuality(
  deviceCapabilities: DeviceCapabilities,
  bandwidth: BandwidthEstimate,
  options: VideoOptimizationOptions = {}
): VideoQuality {
  // Force low quality if requested or data saver is on
  if (options.forceLowQuality || deviceCapabilities.saveData || bandwidth.isMetered) {
    return 'low';
  }

  // Don't use high quality on mobile unless explicitly allowed
  if (deviceCapabilities.isMobile && !options.allowMobileHD) {
    return bandwidth.effectiveType === '4g' || bandwidth.effectiveType === '5g' ? 'medium' : 'low';
  }

  // Low power devices get lower quality
  if (deviceCapabilities.isLowPower) {
    return 'medium';
  }

  // Check bandwidth thresholds
  if (bandwidth.downlink >= 10 && bandwidth.rtt < 100) {
    return options.maxQuality || 'high';
  } else if (bandwidth.downlink >= 5) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get the best video variant for current conditions
 */
export async function getOptimizedVideoVariant(
  asset: AssetDefinition,
  options: VideoOptimizationOptions = {}
): Promise<AssetVariant | null> {
  const [capabilities, bandwidth] = await Promise.all([
    getDeviceCapabilities(),
    Promise.resolve(estimateBandwidth()),
  ]);

  const quality = selectOptimalQuality(capabilities, bandwidth, options);

  // Map quality to bandwidth threshold
  const qualityThresholds: Record<VideoQuality, number> = {
    high: 10,
    medium: 5,
    low: 0,
  };

  const targetBandwidth = options.forceLowQuality ? 0 : qualityThresholds[quality];

  return getOptimalVariant(asset, targetBandwidth, capabilities.supportsWebM);
}

/**
 * Preload a video with the optimal variant
 */
export async function preloadOptimizedVideo(
  asset: AssetDefinition,
  options: VideoOptimizationOptions = {}
): Promise<HTMLVideoElement | null> {
  const variant = await getOptimizedVideoVariant(asset, options);

  if (!variant) {
    console.warn(`No compatible variant found for asset: ${asset.id}`);
    return null;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video: ${variant.url}`));

    video.src = variant.url;
  });
}

/**
 * Progressive loading - load first frame quickly, then buffer rest
 */
export async function loadVideoProgressively(
  asset: AssetDefinition,
  onFirstFrame: () => void,
  onFullyBuffered: () => void,
  options: VideoOptimizationOptions = {}
): Promise<HTMLVideoElement | null> {
  const variant = await getOptimizedVideoVariant(asset, options);

  if (!variant) {
    return null;
  }

  const video = document.createElement('video');
  video.preload = 'metadata';
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;

  let firstFrameShown = false;

  video.onloadeddata = () => {
    if (!firstFrameShown) {
      firstFrameShown = true;
      onFirstFrame();
      // Switch to auto preload for full buffering
      video.preload = 'auto';
    }
  };

  video.oncanplaythrough = () => {
    onFullyBuffered();
  };

  video.src = variant.url;

  return video;
}

/**
 * Create a video element with mobile-optimized settings
 */
export function createMobileOptimizedVideo(
  src: string,
  poster?: string
): HTMLVideoElement {
  const video = document.createElement('video');

  // Essential mobile attributes
  video.playsInline = true;
  video.muted = true;
  video.preload = 'metadata';
  video.crossOrigin = 'anonymous';

  // Disable controls for cinematic experience
  video.controls = false;
  video.disableRemotePlayback = true;
  video.disablePictureInPicture = true;

  // Optimize for battery and performance
  if ('playsInline' in video) {
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
  }

  // Disable download button on iOS
  video.setAttribute('controlsList', 'nodownload');

  if (poster) {
    video.poster = poster;
  }

  video.src = src;

  return video;
}

/**
 * Get estimated file size for a variant
 */
export function getEstimatedFileSize(variant: AssetVariant): string {
  const bytes = variant.fileSize;
  if (bytes === 0) return 'Unknown';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Clear capability caches (useful for testing)
 */
export function clearCaches(): void {
  cachedCapabilities = null;
  cachedBandwidth = null;
}

/**
 * React hook for video optimization
 * Returns optimized settings for the current device/connection
 */
export function getVideoSettingsForDevice(): {
  preferredFormat: 'webm' | 'mp4';
  maxResolution: number;
  autoplay: boolean;
  preload: 'none' | 'metadata' | 'auto';
  muted: boolean;
} {
  const { isMobile, supportsWebM, maxResolution } = cachedCapabilities || {
    isMobile: false,
    supportsWebM: true,
    maxResolution: 1920,
  };

  return {
    preferredFormat: supportsWebM ? 'webm' : 'mp4',
    maxResolution,
    autoplay: true,
    preload: isMobile ? 'metadata' : 'auto',
    muted: true, // Required for autoplay
  };
}
