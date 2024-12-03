/**
 * next-auth requires email addresses for all users. However, we don't know user
 * emails for certain login methods such as WeChat. This module generates
 * fake email addresses that are guaranteed to be unique and fake.
 */
import crypto from "crypto";
import invariant from "tiny-invariant";

export const fakeEmailDomain = "@f.ml";

export function isFakeEmail(email: string) {
  invariant(email);
  return email.endsWith(fakeEmailDomain);
}

export function newFakeEmail() {
  return crypto.randomUUID().toString() + fakeEmailDomain;
}
