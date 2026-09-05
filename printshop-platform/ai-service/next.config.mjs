/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The embedding model and the pg driver must stay real Node modules: they load
  // native/WASM assets that a bundler would mangle.
  serverExternalPackages: ['@xenova/transformers', 'pg', 'onnxruntime-node'],
};
export default nextConfig;
