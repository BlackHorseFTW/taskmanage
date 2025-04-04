/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Also ignore ESLint errors and warnings in the build process
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Disable static generation for pages with errors
    esmExternals: 'loose',
    // Skip type checking
    skipTypechecking: true,
    // Skip middleware for static generation
    skipMiddlewareUrlNormalize: true
  },
  // Disable static exports since we're using dynamic server features
  output: "standalone",
  // Make all pages dynamic since we're using cookies
  staticPageGenerationTimeout: 90,
  compiler: {
    // Remove console.logs in production build
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  }
};

export default nextConfig; 