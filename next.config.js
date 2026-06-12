/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },

  async redirects() {
    return [
      {
        source: '/harvard2026',
        destination: 'https://yuanjian.net/blog/harvard2026',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
