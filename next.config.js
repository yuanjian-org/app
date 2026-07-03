/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // https://github.com/vercel/next.js/issues/59594
  experimental: {
    serverMinification: false,
  },

  publicRuntimeConfig: {
    ENABLE_ORGS: process.env.NEXT_PUBLIC_ENABLE_ORGS,
    ENABLE_RELATIONAL: process.env.NEXT_PUBLIC_ENABLE_RELATIONAL,
    ENABLE_VOLUNTEERS: process.env.NEXT_PUBLIC_ENABLE_VOLUNTEERS,
    ENABLE_INTERVIEWS: process.env.NEXT_PUBLIC_ENABLE_INTERVIEWS,
    ENABLE_EXAMS: process.env.NEXT_PUBLIC_ENABLE_EXAMS,
    ENABLE_PROJECTS: process.env.NEXT_PUBLIC_ENABLE_PROJECTS,
    ENABLE_MENTEE_PROFILE: process.env.NEXT_PUBLIC_ENABLE_MENTEE_PROFILE,
  },
};

module.exports = nextConfig;
