/**
 * Re-export from the BROWSER build of @huggingface/transformers.
 *
 * The package.json "exports" field has a "node" condition that selects
 * transformers.node.mjs (which imports onnxruntime-node with native .node
 * binaries). Webpack's worker child compiler picks the node entry, causing
 * build failures. Using a relative path to the dist/transformers.web.js
 * bypasses the exports condition and ensures onnxruntime-web (WASM) is used.
 *
 * In tests, this module is mocked via vi.mock('./transformers-entry').
 */

// @ts-expect-error — no type declarations for direct dist path
export { pipeline } from '../node_modules/@huggingface/transformers/dist/transformers.web.js';

// Type-only export is erased at compile time — safe to use the bare specifier.
export type { FeatureExtractionPipeline } from '@huggingface/transformers';
