/**
 * This is a server-side variable. To refer to it from the client side,
 * fetch it in `getServerSideProps` and pass it to the page as a prop.
 */
export function isDemo() {
  return process.env.IS_DEMO === "true";
}
