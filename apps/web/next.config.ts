import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cortex/ui', '@cortex/ai-components', '@cortex/shared'],
};

export default nextConfig;
