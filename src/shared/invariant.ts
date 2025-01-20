import tinyInvariant from "tiny-invariant";

// A wrapper around tiny-invariant that enforces the message.
export default function invariant(
  condition: any,
  message: string,
): asserts condition {
  tinyInvariant(condition, message);
}
