/**
 * This is a server-side variable. To refer to it from the client side,
 * use `useStaticGlobalConfigs()` from `src/components/useStaticGlobalConfigs.ts`.
 */
export function isDemo() {
  return process.env.IS_DEMO === "true";
}
