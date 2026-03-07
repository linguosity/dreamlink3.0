/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  // Use a more compatible output mode for Vercel
  output: 'standalone',
  reactStrictMode: true,
}

export default nextConfig
