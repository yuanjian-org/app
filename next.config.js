/** @type {import('next').NextConfig} */
const { i18n } = require("./next-i18next.config");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

// Docker matrix builds set DOCKER_BUILD=1 because lint and typecheck already
// run once in the `test` job before `build`.
const skipBuildChecks = process.env.DOCKER_BUILD === "1";

const VENDOR_MODULE_RE =
  /[\\/]node_modules[\\/](react-icons[\\/][^\\/]+|(?:@[^\\/]+[\\/])?[^\\/]+)/;

const nextConfig = {
  reactStrictMode: true,
  i18n, // I18N-MARKER for build automation. Do not remove.
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: skipBuildChecks,
  },
  typescript: {
    ignoreBuildErrors: skipBuildChecks,
  },

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },

  // Emit bundled server `node_modules` (e.g. `react-icons/*`) into dedicated
  // `vendor-*.js` chunks so Docker builds can isolate them into an
  // mtime-clamped layer that is not re-uploaded on app code changes.
  webpack: (config, { dev, isServer, nextRuntime }) => {
    if (!dev && isServer && nextRuntime === "nodejs") {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...(config.optimization.splitChunks?.cacheGroups || {}),
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            chunks: "all",
            minSize: 0,
            minChunks: 1,
            priority: 20,
            name: (mod) => {
              const id = mod.nameForCondition?.() || "";
              const m = id.match(VENDOR_MODULE_RE);
              const pkg = m ? m[1].replace(/[\\/@]/g, "_") : "misc";
              return `vendor-${pkg}`;
            },
          },
        },
      };
    }
    return config;
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
