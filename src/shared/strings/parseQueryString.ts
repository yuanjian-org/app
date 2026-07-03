import { NextRouter } from "next/router";

export function parseQueryString(router: NextRouter, slug: string) {
  return typeof router.query[slug] === "string"
    ? (router.query[slug] as string)
    : undefined;
}
