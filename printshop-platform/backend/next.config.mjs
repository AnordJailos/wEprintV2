
/** @type {import('next').NextConfig} */

const nextConfig = {
  // The API is JSON only; no image optimisation or React server rendering work
  // is needed beyond the Swagger page.
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg'],

  experimental: {
    // Design uploads are capped in code as well (see core/config.ts).
    serverActions: { bodySizeLimit: '25mb' },
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;


