let fundebug: any = null;

// Initialize Fundebug also in development mode to ensure it the module loads.
if (typeof window !== "undefined") {
  void import("fundebug-javascript").then((module) => {
    fundebug = module.default;
    initFundebug();
  });
}

export default fundebug;

export function initFundebug(userId?: string) {
  fundebug.init({
    apikey: "724912ab5a0339527a4745dbb8c0192e0e5dfbf82ae6c324a5f31ea8554ae98e",
    releasestage: process.env.NODE_ENV,
    user: { name: userId ?? "(not logged in)", email: "" },
  });
}

export function isFundebugEnabled() {
  return (
    typeof window !== "undefined" && process.env.NODE_ENV !== "development"
  );
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
