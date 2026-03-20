/**
 * This is a server-side variable. To refer to it from the client side,
 * use `useIsDemo()` from `src/components/useIsDemo.ts`.
 */
export function isDemo() {
  return process.env.IS_DEMO === "true";
}
