const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@trainhive/shared', '@trainhive/auth'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['typeorm', '@trainhive/db'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // Resolve aliases for both server and client
    config.resolve.alias = config.resolve.alias || {};

    if (isServer) {
      // Resolve @trainhive/db to dist folder to avoid webpack parsing TypeORM decorators
      config.resolve.alias['@trainhive/db'] = path.resolve(__dirname, '../../packages/db/dist');
    }

    // Resolve @app alias for Next.js webpack
    config.resolve.alias['@app'] = path.resolve(__dirname, './app');

    return config;
  },
};

module.exports = nextConfig;

