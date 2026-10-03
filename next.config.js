/** @type {import('next').NextConfig} */
const { i18n } = require("./next-i18next.config");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");
const nextConfig = {
  reactStrictMode: true,
  i18n, // I18N-MARKER for build automation. Do not remove.
  output: "standalone",

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },
};

// `next dev` and `next build` both write to distDir (`.next` by default).
// Running `yarn build` while `yarn dev` is running corrupts the dev server's
// cache and breaks it at runtime. Give dev its own directory to avoid that.
// `next build` and `next start` keep using `.next`, which Docker and Vercel
// depend on.
module.exports = (phase) => ({
  ...nextConfig,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
});
