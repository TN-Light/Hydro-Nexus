/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable production optimizations
  experimental: {
    // Note: optimizeCss is disabled because it requires 'critters'/'beasties' package
    // and may cause build issues on Vercel. Uncomment if you install beasties:
    // optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Split vendor chunks for better caching
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          priority: 1,
        },
        three: {
          test: /[\\/]node_modules[\\/](@react-three|three)[\\/]/,
          chunks: 'async',
          name: 'three-vendor',
          priority: 2,
        },
        ui: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          chunks: 'all',
          name: 'ui-vendor',
          priority: 2,
        },
      }
    }
    return config
  },
}

export default nextConfig
