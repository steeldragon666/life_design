// Video Effects & Transition System
// Cinematic video components for Life Design experience

export { VideoTransition } from './video-transition';
export type { VideoTransitionProps } from './video-transition';

export { ParallaxVideoBackground } from './parallax-video';
export type { ParallaxVideoBackgroundProps } from './parallax-video';

export { VideoLoader } from './video-loader';
export type { VideoLoaderProps } from './video-loader';

export { VideoOverlay, VideoOverlayPresets } from './video-overlay';
export type { VideoOverlayProps, GradientOverlay } from './video-overlay';

// Re-export hooks for convenience
export {
  useVideoTransition,
  type TransitionType,
  type TransitionState,
  type UseVideoTransitionOptions,
  type UseVideoTransitionReturn,
} from '@/hooks/use-video-transition';

export {
  useParallax,
  type ParallaxValues,
  type UseParallaxOptions,
  type UseParallaxReturn,
} from '@/hooks/use-parallax';
