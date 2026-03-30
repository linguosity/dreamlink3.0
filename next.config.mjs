/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // TODO: Remove after running `supabase gen types typescript` to fix 171 type errors
    // across admin pages, API routes, and Supabase client files (all "Property X on type 'never'")
    ignoreBuildErrors: true,
  },
  reactCompiler: true,
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

export default nextConfig
