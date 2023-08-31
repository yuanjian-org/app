import { NextRouter } from "next/router";

export default function replaceUrlParam(router: NextRouter, key: string, value: string) {
  const query = structuredClone(router.query);
  query[key] = value;
  router.replace({ pathname: router.pathname, query });
}
