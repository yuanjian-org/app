/**
 * Use `useStaticGlobalConfigs()` on the client side
 */
export function isDemo() {
  return process.env.IS_DEMO === "true";
}
