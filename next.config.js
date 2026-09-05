const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Remove if not using Server Components
    serverComponentsExternalPackages: ['mongodb', 'node-cache', 'joi'],
    // Next 14.2.x still gates instrumentation.js's register() hook behind this
    // flag (stabilized/default-on only starting Next 15) — required for
    // assertEnvValid() to actually run at server startup.
    instrumentationHook: true,
  },
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    // CSP is handled by middleware.js - no need to duplicate here
    // This avoids conflicts between middleware and next.config headers
    return [];
  },
};

module.exports = nextConfig;
