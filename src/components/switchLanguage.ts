import { NextRouter } from "next/router";

export function switchLanguage(router: NextRouter) {
  const locale = router.locale === "en" ? "zh" : "en";
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${365 * 24 * 60 * 60}`;
  void router.replace(router.asPath, undefined, { locale });
}
