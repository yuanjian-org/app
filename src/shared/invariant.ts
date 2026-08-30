const prefix = "Invariant failed";

/**
 * Asserts condition is truthy. Always preserves error message regardless of
 * process.env.NODE_ENV (unlike tiny-invariant which strips messages in prod).
 */
export default function invariant(
  condition: any,
  message?: string | (() => string),
): asserts condition {
  if (condition) {
    return;
  }
  const provided =
    typeof message === "function" ? (message as () => string)() : message;
  const value = provided ? `${prefix}: ${provided}` : prefix;
  throw new Error(value);
}
