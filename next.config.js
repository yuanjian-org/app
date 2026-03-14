/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },

  env: {
    IS_DEMO: process.env.IS_DEMO,
  },
};

module.exports = nextConfig;
