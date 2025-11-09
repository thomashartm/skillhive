const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@trainhive/shared', '@trainhive/db', '@trainhive/auth'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

module.exports = nextConfig;

