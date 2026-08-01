/** @type {import('next').NextConfig} */
const { i18n } = require("./next-i18next.config");
const nextConfig = {
  reactStrictMode: true,
  i18n, // I18N-MARKER for build automation. Do not remove.
  output: "standalone",

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },

  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
