import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifedesign.app',
  appName: 'Life Design',
  webDir: 'out', // Capacitor expects a web directory even if it's not and we're just using the server
  server: {
    url: 'http://localhost:3000',
    cleartext: true
  }
};

export default config;
