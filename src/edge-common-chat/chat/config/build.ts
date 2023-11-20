export const getBuildConfig = () => {
  const buildMode = "standalone";
  const isApp = false;
  const version = "v0.0.1";

  return {
    version,
    commitDate: "unknown",
    commitHash: "unknown",
    buildMode,
    isApp,
  };
};

export type BuildConfig = ReturnType<typeof getBuildConfig>;
