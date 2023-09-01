import { NextRouter } from "next/router";

export function parseQueryString(router: NextRouter, slug: string): string | null {
  return typeof router.query[slug] === 'string' ? router.query[slug] as string : null;
}

export function parseQueryStringOrUnknown(router: NextRouter, slug: string): string {
  return parseQueryString(router, slug) ?? "unknown";
}