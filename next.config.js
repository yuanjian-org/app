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

  publicRuntimeConfig: {
    NEXT_PUBLIC_ENABLE_ORGS: process.env.NEXT_PUBLIC_ENABLE_ORGS,
    NEXT_PUBLIC_ENABLE_RELATIONAL: process.env.NEXT_PUBLIC_ENABLE_RELATIONAL,
    NEXT_PUBLIC_ENABLE_VOLUNTEERS: process.env.NEXT_PUBLIC_ENABLE_VOLUNTEERS,
    NEXT_PUBLIC_ENABLE_INTERVIEWS: process.env.NEXT_PUBLIC_ENABLE_INTERVIEWS,
    NEXT_PUBLIC_ENABLE_EXAMS: process.env.NEXT_PUBLIC_ENABLE_EXAMS,
    NEXT_PUBLIC_ENABLE_PROJECTS: process.env.NEXT_PUBLIC_ENABLE_PROJECTS,
    NEXT_PUBLIC_ENABLE_MENTEE_PROFILE: process.env.NEXT_PUBLIC_ENABLE_MENTEE_PROFILE,
    NEXT_PUBLIC_ENABLE_ENGLISH: process.env.NEXT_PUBLIC_ENABLE_ENGLISH,
  },
};

module.exports = nextConfig;
