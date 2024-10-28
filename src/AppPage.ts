import { NextPage } from "next";

export type AppPageType = "wide" | "full";

type AppPage<P = {}, IP = P> = NextPage<P, IP> & {
  type?: AppPageType,

  // Page title used for <html><head><title>. pageProps is the properties passed
  // into statically generated pages from getStaticProperties.
  title?: string | ((pageProps: any) => string),
}
export default AppPage;

/**
 * Occupy 100% useable width instead of leaving a broad margin on the right.
 */
export function widePage(page: AppPage): AppPage {
  page.type = "wide";
  return page;
}

/**
 * Occupy the entire useable area with no margin to neighboring elements. Also
 * remove pager footer.
 */
export function fullPage(page: AppPage): AppPage {
  page.type = "full";
  return page;
}
