/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 828, 1200],
    imageSizes: [64, 128, 256],
  },
}

module.exports = nextConfig
