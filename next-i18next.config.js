module.exports = {
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "en"],
    // Disable automatic locale detection based on browser/header info.
    localeDetection: false,
  },
  // Explicit namespaces since flat structure disables auto-discovery.
  ns: ["common"],
  // Flat locale file structure (e.g. public/locales/zh.json).
  localeStructure: "{{lng}}",
};
