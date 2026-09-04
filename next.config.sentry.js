import { withSentryConfig } from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || 'project-manager',
  silent: !isProduction,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnel: '/api/sentry-tunnel',
  disableLogger: isProduction,
};

const SentryWebpackPluginConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT || 'project-manager',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !isProduction,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: isProduction,
  automaticVercelMonitors: true,
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.githubusercontent.com' },
      { protocol: 'https', hostname: '**.microsoft.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  serverComponentsExternalPackages: ['@azure/msal-node', 'mongoose', 'nodemailer'],
};

export default isProduction ? withSentryConfig(nextConfig, SentryWebpackPluginConfig) : nextConfig;
