import { NextRouter } from "next/router";
import { loginCallbackUrlKey, sanitizeCallbackUrl } from "shared/callbackUrl";
import { parseQueryString } from "./strings";

export function loginCallbackUrl(router: NextRouter) {
  return sanitizeCallbackUrl(parseQueryString(router, loginCallbackUrlKey));
}

export function loginUrl(callbackUrl?: string) {
  return `/auth/login?${callbackUrlParam(callbackUrl)}`;
}

function callbackUrlParam(url: string | undefined) {
  return url ? `${loginCallbackUrlKey}=${encodeURIComponent(url)}` : "";
}
