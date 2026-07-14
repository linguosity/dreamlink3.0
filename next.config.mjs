import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root: a stray lockfile in the home directory (~/
  // pnpm-lock.yaml) was making Turbopack infer ~ as the root and warn on
  // every `next dev`. Deleting that file also works, but pinning is robust.
  turbopack: {
    root: new URL(".", import.meta.url).pathname,
  },
  typescript: {
    // Type errors fail the build (2026-06-09 audit, M7). `npm run typecheck`
    // passes as of this change — keep it that way.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'whuboznlopvhzwxdscah.supabase.co',
        // `sign` covers the private-bucket signed URLs (migration
        // 20260609000001); `public` kept during the transition for any
        // legacy rows not yet re-signed via /api/backfill-images.
        pathname: '/storage/v1/object/sign/**',
      },
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
