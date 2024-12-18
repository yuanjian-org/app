/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },
};

module.exports = nextConfig;
