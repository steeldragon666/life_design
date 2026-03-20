// Webpack loader that replaces native .node binaries with an empty module.
// Used to prevent onnxruntime-node's native bindings from breaking client builds.
module.exports = function () {
  return 'module.exports = {};';
};
