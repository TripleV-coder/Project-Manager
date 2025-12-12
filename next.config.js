const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove if not using Server Components
    serverComponentsExternalPackages: ['mongodb'],
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
    // Parse CORS origins from environment - defaults to localhost for development
    const corsOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).join(',')
      : 'http://localhost:3000';

    return [
      {
        source: "/(.*)",
        headers: [
          // Security Headers - Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Content Security Policy - Strict
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self';"
          },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable browser XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer Policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions Policy
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          // HSTS - Force HTTPS (max-age: 31536000 = 1 year)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // CORS - Restrictive (single origin or comma-separated list)
          { key: "Access-Control-Allow-Origin", value: corsOrigins },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          // Only allow specific headers, not wildcard
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Max-Age", value: "3600" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
