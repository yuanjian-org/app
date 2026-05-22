/**
 * Use `useStaticGlobalConfigs()` on the client side
 */
export function getWhiteLabel() {
  return process.env.WHITE_LABEL || "yuantu";
}
