import { NextRouter } from "next/router";

export function parseQueryParameter(router: NextRouter, slug: string): string {
  return typeof router.query[slug] === 'string' ? router.query[slug] as string : 'unkonwn';
}
