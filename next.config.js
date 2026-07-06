const { i18n } = require("./next-i18next.config");

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n,
  reactStrictMode: true,
  output: "standalone",

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },
};

module.exports = nextConfig;
