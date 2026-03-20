// Stub for expo-health in test environments.
// expo-health is a React Native / Expo package that does not exist on web/jsdom.
// The real module is dynamically imported in apple-health.ts behind a try/catch,
// but Vite still attempts to resolve it at transform time. This stub satisfies
// the resolver without pulling in any native code.
export default {};
