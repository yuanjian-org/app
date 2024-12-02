import crypto from "crypto";
import invariant from "tiny-invariant";

const unboundEmailDomain = "@ub.nd";

export function isBoundEmail(email: string) {
  invariant(email);
  return !email.endsWith(unboundEmailDomain);
}

export function newUnboundEmail() {
  return crypto.randomUUID().toString() + unboundEmailDomain;
}
