import { isProd } from "shared/isProd";

let fundebug: any = null;

export function isFundebugEnabled() {
  return typeof window !== "undefined" && isProd();
}

console.log(">>>1", typeof window !== "undefined");
console.log(">>>2", isProd());
console.log(">>>3", isFundebugEnabled());
console.log(">>>4", process.env.NODE_ENV);

if (isFundebugEnabled()) {
  void import("fundebug-javascript").then((module) => {
    fundebug = module.default;
    initFundebug();
  });
}

export default fundebug;

export function initFundebug(userId?: string) {
  if (!isFundebugEnabled()) return;
  fundebug.init({
    apikey: "724912ab5a0339527a4745dbb8c0192e0e5dfbf82ae6c324a5f31ea8554ae98e",
    releasestage: process.env.NODE_ENV,
    user: { name: userId ?? "(not logged in)", email: "" },
  });
}
/**
 * Manually report an error to Fundebug
 * @param error - The error object or error message
 * @param metaData - Additional metadata to include with the error
 */
export function reportError(
  error: Error | string,
  metaData?: Record<string, any>,
) {
  if (!isFundebugEnabled()) return;
  if (typeof error === "string") {
    fundebug.notifyError(new Error(error), { metaData });
  } else {
    fundebug.notifyError(error, { metaData });
  }
}

/**
 * Add breadcrumb for debugging
 * @param message - Breadcrumb message
 * @param category - Category of the breadcrumb
 */
export function addFundebugBreadcrumb(message: string, category?: string) {
  if (!isFundebugEnabled()) return;
  fundebug.leaveBreadcrumb({
    message,
    category: category || "user-action",
    timestamp: new Date().toISOString(),
  });
}
