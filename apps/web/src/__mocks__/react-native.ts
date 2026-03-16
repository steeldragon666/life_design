// Stub for react-native in web test environment.
// apple-health.ts dynamically imports react-native for iOS platform detection.
// This stub prevents Vite from failing to resolve it during web tests.

export const Platform = { OS: 'web' as const };
export default { Platform };
