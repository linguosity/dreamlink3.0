import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'whuboznlopvhzwxdscah.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Tree-shake Sentry SDK debug/logger statements out of the production bundle.
  // Replaces the deprecated top-level `disableLogger` option (removed in @sentry/nextjs 10.46+).
  // Note: Turbopack does not yet honor this hook (nor did it honor `disableLogger`),
  // so under Next.js 16's Turbopack bundler this is effectively a webpack-only optimization.
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
