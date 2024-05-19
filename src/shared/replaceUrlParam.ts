import { NextRouter } from "next/router";

export default async function replaceUrlParam(router: NextRouter, key: string,
  value: string) 
{
  const query = structuredClone(router.query);
  query[key] = value;
  await router.replace({ pathname: router.pathname, query });
}
