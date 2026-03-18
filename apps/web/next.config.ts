import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://app.posthog.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://i.scdn.co https://lh3.googleusercontent.com https://maps.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://app.posthog.com https://generativelanguage.googleapis.com https://www.googleapis.com https://cdn.jsdelivr.net https://huggingface.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@life-design/core', '@life-design/ui', '@life-design/ai', '@life-design/ai-local'],
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-web', 'onnxruntime-node'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  /**
   * Webpack overrides:
   * - Stub out `expo-health` and `react-native` which are dynamically imported
   *   by packages/core/src/connectors/apple-health.ts for iOS-only HealthKit
   *   access. These modules are not available in the web build and must be
   *   replaced with empty stubs to prevent "Module not found" build failures.
   */
  webpack(config: Configuration, { isServer }: { isServer: boolean }) {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...(config.resolve.fallback as Record<string, unknown>),
      'expo-health': false,
      'react-native': false,
    };

    // Prevent webpack from trying to bundle native .node binaries
    // from onnxruntime-node (used by @huggingface/transformers).
    // These are only needed at runtime on the server, not at build time.
    if (isServer) {
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push('onnxruntime-node');
      }
    }

    // Ignore .node binary files in client bundles
    config.module = config.module ?? {};
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader',
    });

    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
