import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/react-vite',
  async viteFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string> | undefined ?? {}),
      // Redirect @life-design/core to a browser-safe stub that excludes
      // connector modules which depend on Node.js (crypto) / native (expo-health) APIs.
      '@life-design/core': path.resolve(__dirname, 'core-browser-stub.ts'),
    };
    return config;
  },
};

export default config;
