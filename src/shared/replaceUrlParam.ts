import { NextRouter } from "next/router";

export default async function replaceUrlParam(router: NextRouter, key: string,
  value: string) 
{
  await router.replace({
    pathname: router.pathname,
    query: { ...router.query, [key]: value },
  });
}
