// Browser-safe re-export of @life-design/core for Storybook.
// Excludes connector modules that depend on Node.js (crypto) or
// native (expo-health) APIs which cannot run in a browser context.
export * from '../../../packages/core/src/config';
export * from '../../../packages/core/src/enums';
export * from '../../../packages/core/src/types';
export * from '../../../packages/core/src/validation';
export * from '../../../packages/core/src/scoring';
export * from '../../../packages/core/src/correlation';
export * from '../../../packages/core/src/feature-extraction';
export * from '../../../packages/core/src/holistic';
// connectors intentionally excluded (Node.js / native dependencies)
