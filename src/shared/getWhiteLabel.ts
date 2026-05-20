/**
 * This is a server-side variable. To refer to it from the client side,
 * use `useStaticGlobalConfigs()` from `src/components/useStaticGlobalConfigs.ts`.
 *
 * TODO: move to a server-only folder
 */
export function getWhiteLabel() {
  return process.env.WHITE_LABEL || "yuantu";
}
