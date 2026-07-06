/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },

  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
  },
};

module.exports = nextConfig;
