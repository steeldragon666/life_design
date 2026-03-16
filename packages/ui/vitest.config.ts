import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // expo-health is a React Native / Expo module that does not exist in
      // a jsdom test environment. Stub it out so the @life-design/core barrel
      // (which re-exports apple-health.ts) can be resolved without error.
      'expo-health': new URL('./src/__mocks__/expo-health.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
