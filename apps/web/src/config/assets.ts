/**
 * Asset Manifest for Life Design Cinematic Experience
 * Central configuration for all video, image, and audio assets
 */

export type VideoQuality = 'high' | 'medium' | 'low';
export type AssetType = 'video' | 'image' | 'audio' | 'font';
export type AssetPriority = 'critical' | 'high' | 'medium' | 'low';

export interface AssetVariant {
  quality: VideoQuality;
  url: string;
  bandwidth: number; // Mbps threshold
  resolution: string;
  fileSize: number; // Approximate bytes
}

export interface AssetDefinition {
  id: string;
  type: AssetType;
  priority: AssetPriority;
  variants: AssetVariant[];
  fallback?: string;
  preload: boolean;
  lazy?: boolean;
  metadata?: {
    duration?: number;
    format?: string;
    description?: string;
  };
}

export interface VoiceSample {
  id: string;
  voiceId: string;
  text: string;
  url: string;
  duration: number;
}

// CDN Configuration
const CDN_BASE = process.env.NEXT_PUBLIC_ASSET_CDN || 'https://assets.lifedesign.app';
const VIDEO_CDN = `${CDN_BASE}/videos`;
const IMAGE_CDN = `${CDN_BASE}/images`;
const AUDIO_CDN = `${CDN_BASE}/audio`;

// Video Asset Definitions
export const videoAssets: Record<string, AssetDefinition> = {
  // Primary cinematic opener - neural/brain visualization
  brainCinematic: {
    id: 'brain-cinematic',
    type: 'video',
    priority: 'critical',
    preload: true,
    variants: [
      {
        quality: 'high',
        url: `${VIDEO_CDN}/brain-cinematic-4k.webm`,
        bandwidth: 10,
        resolution: '3840x2160',
        fileSize: 45_000_000,
      },
      {
        quality: 'high',
        url: `${VIDEO_CDN}/brain-cinematic-1080.mp4`,
        bandwidth: 5,
        resolution: '1920x1080',
        fileSize: 25_000_000,
      },
      {
        quality: 'medium',
        url: `${VIDEO_CDN}/brain-cinematic-720.webm`,
        bandwidth: 2,
        resolution: '1280x720',
        fileSize: 12_000_000,
      },
      {
        quality: 'low',
        url: `${VIDEO_CDN}/brain-cinematic-480.mp4`,
        bandwidth: 0,
        resolution: '854x480',
        fileSize: 5_000_000,
      },
    ],
    fallback: `${IMAGE_CDN}/brain-cinematic-poster.jpg`,
    metadata: {
      duration: 8,
      format: 'video/webm;codecs=vp9',
      description: 'Neural network visualization with glowing synaptic connections',
    },
  },

  // Secondary cinematic - serene beach/water
  beachCinematic: {
    id: 'beach-cinematic',
    type: 'video',
    priority: 'high',
    preload: true,
    variants: [
      {
        quality: 'high',
        url: `${VIDEO_CDN}/beach-cinematic-1080.webm`,
        bandwidth: 8,
        resolution: '1920x1080',
        fileSize: 30_000_000,
      },
      {
        quality: 'medium',
        url: `${VIDEO_CDN}/beach-cinematic-720.mp4`,
        bandwidth: 3,
        resolution: '1280x720',
        fileSize: 15_000_000,
      },
      {
        quality: 'low',
        url: `${VIDEO_CDN}/beach-cinematic-480.webm`,
        bandwidth: 0,
        resolution: '854x480',
        fileSize: 6_000_000,
      },
    ],
    fallback: `${IMAGE_CDN}/beach-cinematic-poster.jpg`,
    metadata: {
      duration: 12,
      format: 'video/webm;codecs=vp9',
      description: 'Calming ocean waves and shoreline meditation scene',
    },
  },

  // Ambient background for dashboard
  ambientFlow: {
    id: 'ambient-flow',
    type: 'video',
    priority: 'medium',
    preload: false,
    lazy: true,
    variants: [
      {
        quality: 'medium',
        url: `${VIDEO_CDN}/ambient-flow-720.webm`,
        bandwidth: 2,
        resolution: '1280x720',
        fileSize: 8_000_000,
      },
      {
        quality: 'low',
        url: `${VIDEO_CDN}/ambient-flow-480.mp4`,
        bandwidth: 0,
        resolution: '854x480',
        fileSize: 3_000_000,
      },
    ],
    fallback: `${IMAGE_CDN}/ambient-flow-poster.jpg`,
    metadata: {
      duration: 30,
      format: 'video/webm;codecs=vp9',
      description: 'Subtle particle flow animation for dashboard background',
    },
  },
};

// Image Asset Definitions
export const imageAssets: Record<string, AssetDefinition> = {
  heroIllustration: {
    id: 'hero-illustration',
    type: 'image',
    priority: 'high',
    preload: true,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/life-design-hero-illustration.webp`,
        bandwidth: 0,
        resolution: '2400x1600',
        fileSize: 350_000,
      },
    ],
    fallback: `${IMAGE_CDN}/life-design-hero-illustration.png`,
  },

  lifeOrbTexture: {
    id: 'life-orb-texture',
    type: 'image',
    priority: 'high',
    preload: true,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/life-orb-3d-icon.webp`,
        bandwidth: 0,
        resolution: '1024x1024',
        fileSize: 180_000,
      },
    ],
  },

  dimensionIcons: {
    id: 'dimension-icons',
    type: 'image',
    priority: 'medium',
    preload: true,
    lazy: false,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/life-dimensions-3d-icons.webp`,
        bandwidth: 0,
        resolution: '1200x800',
        fileSize: 250_000,
      },
    ],
    fallback: `${IMAGE_CDN}/life-dimensions-3d-icons.png`,
  },

  isometricIcon: {
    id: 'isometric-icon',
    type: 'image',
    priority: 'medium',
    preload: false,
    lazy: true,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/life-design-isometric-icon.webp`,
        bandwidth: 0,
        resolution: '800x800',
        fileSize: 120_000,
      },
    ],
  },

  goalsPathway: {
    id: 'goals-pathway',
    type: 'image',
    priority: 'medium',
    preload: false,
    lazy: true,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/goals-pathway-illustration.webp`,
        bandwidth: 0,
        resolution: '1600x900',
        fileSize: 280_000,
      },
    ],
  },

  aiMentor: {
    id: 'ai-mentor',
    type: 'image',
    priority: 'low',
    preload: false,
    lazy: true,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/ai-mentor-illustration.webp`,
        bandwidth: 0,
        resolution: '1200x1200',
        fileSize: 200_000,
      },
    ],
  },

  emptyState: {
    id: 'empty-state',
    type: 'image',
    priority: 'low',
    preload: false,
    lazy: true,
    variants: [
      {
        quality: 'high',
        url: `${IMAGE_CDN}/empty-state-illustration.webp`,
        bandwidth: 0,
        resolution: '800x600',
        fileSize: 150_000,
      },
    ],
  },
};

/**
 * Pre-recorded voice samples for the cinematic onboarding experience.
 * These are CDN-hosted MP3 files with static content — NOT part of the
 * ElevenLabs mentor voice system. The mentor voice system uses real-time
 * TTS via /api/tts and the useElevenLabsTTS hook.
 */
export const voiceSamples: VoiceSample[] = [
  {
    id: 'sage-welcome',
    voiceId: 'sage',
    text: "Welcome to Life Design. I'm here to help you create a life of purpose and balance.",
    url: `${AUDIO_CDN}/voices/sage-welcome.mp3`,
    duration: 4.5,
  },
  {
    id: 'sage-checkin',
    voiceId: 'sage',
    text: "Let's take a moment to check in with yourself. How are you feeling today?",
    url: `${AUDIO_CDN}/voices/sage-checkin.mp3`,
    duration: 5.2,
  },
  {
    id: 'coach-welcome',
    voiceId: 'coach',
    text: "Hey there! Ready to crush your goals today? Let's see what we're working with!",
    url: `${AUDIO_CDN}/voices/coach-welcome.mp3`,
    duration: 4.2,
  },
  {
    id: 'coach-checkin',
    voiceId: 'coach',
    text: "Time for a quick check-in! What's your energy level right now?",
    url: `${AUDIO_CDN}/voices/coach-checkin.mp3`,
    duration: 4.0,
  },
  {
    id: 'zen-welcome',
    voiceId: 'zen',
    text: "Breathe in peace, breathe out tension. Welcome to your sanctuary of self-discovery.",
    url: `${AUDIO_CDN}/voices/zen-welcome.mp3`,
    duration: 6.0,
  },
  {
    id: 'zen-checkin',
    voiceId: 'zen',
    text: "Find a comfortable position. Let's gently explore where you are in this moment.",
    url: `${AUDIO_CDN}/voices/zen-checkin.mp3`,
    duration: 6.5,
  },
  {
    id: 'scholar-welcome',
    voiceId: 'scholar',
    text: "Welcome. Based on behavioral research, we'll optimize your life design parameters together.",
    url: `${AUDIO_CDN}/voices/scholar-welcome.mp3`,
    duration: 5.8,
  },
  {
    id: 'scholar-checkin',
    voiceId: 'scholar',
    text: "Let's gather some data points. How would you rate your current subjective well-being?",
    url: `${AUDIO_CDN}/voices/scholar-checkin.mp3`,
    duration: 6.2,
  },
];

// Loading Messages - Calming, thematic tips
export const loadingMessages = [
  "Preparing your personal life design canvas...",
  "Gathering inspiration from the universe...",
  "Calibrating your life dimensions...",
  "Setting up your growth pathway...",
  "Connecting with your AI mentors...",
  "Arranging your goals into harmony...",
  "Preparing a space for reflection...",
  "Syncing with your aspirations...",
  "Creating a canvas for your dreams...",
  "Aligning with your purpose...",
  "Gathering wisdom for your journey...",
  "Preparing your transformation space...",
  "Tuning into your life frequencies...",
  "Curating your personal growth experience...",
  "Setting intentions for your session...",
];

// Asset loading sequence for cinematic opener
export const cinematicLoadingSequence: string[] = [
  'brainCinematic',
  'beachCinematic',
  'lifeOrbTexture',
  'heroIllustration',
  'dimensionIcons',
];

// All assets that should be preloaded on app init
export const criticalAssets: string[] = [
  'brainCinematic',
  'beachCinematic',
  'heroIllustration',
  'lifeOrbTexture',
];

// Get voice samples for a specific voice
export function getVoiceSamplesForVoice(voiceId: string): VoiceSample[] {
  return voiceSamples.filter(sample => sample.voiceId === voiceId);
}

// Get optimal variant based on bandwidth and device capability
export function getOptimalVariant(
  asset: AssetDefinition,
  bandwidth: number,
  supportsWebM: boolean
): AssetVariant | null {
  // Filter by supported format
  const compatibleVariants = asset.variants.filter(variant => {
    const isWebM = variant.url.endsWith('.webm');
    return supportsWebM || !isWebM;
  });

  // Sort by bandwidth (descending) and find the best fit
  const sortedVariants = compatibleVariants.sort((a, b) => b.bandwidth - a.bandwidth);

  for (const variant of sortedVariants) {
    if (bandwidth >= variant.bandwidth) {
      return variant;
    }
  }

  // Return lowest quality if no match found
  return sortedVariants[sortedVariants.length - 1] || null;
}

// Get asset by ID
export function getAssetById(id: string): AssetDefinition | undefined {
  return videoAssets[id] || imageAssets[id];
}

// Get all assets as array
export function getAllAssets(): AssetDefinition[] {
  return [
    ...Object.values(videoAssets),
    ...Object.values(imageAssets),
  ];
}

// Get assets by priority
export function getAssetsByPriority(priority: AssetPriority): AssetDefinition[] {
  return getAllAssets().filter(asset => asset.priority === priority);
}

// Service Worker cache configuration hints
export const swCacheConfig = {
  // Assets to cache on install
  precacheAssets: [
    ...criticalAssets.map(id => {
      const asset = getAssetById(id);
      return asset?.variants[0]?.url;
    }).filter(Boolean),
  ],

  // Cache strategies by asset type
  strategies: {
    video: 'cache-first',
    image: 'stale-while-revalidate',
    audio: 'cache-first',
  },

  // Cache names
  cacheNames: {
    videos: 'life-design-videos-v1',
    images: 'life-design-images-v1',
    audio: 'life-design-audio-v1',
  },
};
