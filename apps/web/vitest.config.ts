import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Stubs for mobile-only imports used in apple-health.ts (iOS connector)
      'react-native': path.resolve(__dirname, './src/__mocks__/react-native.ts'),
      'expo-health': path.resolve(__dirname, './src/__mocks__/expo-health.ts'),
    },
  },
});
