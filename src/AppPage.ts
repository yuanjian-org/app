import { NextPage } from "next";

export type AppPageType = "wide" | "full" | "bare";

type AppPage<P = {}, IP = P> = NextPage<P, IP> & {
  type?: AppPageType,

  // Page title used for <html><head><title>. pageProps is the properties passed
  // into statically generated pages from getStaticProperties.
  title?: string | ((pageProps: any) => string),
}
export default AppPage;

/**
 * Occupy full page width instead of leaving a broad margin on the right.
 */
export function widePage(page: AppPage, title?: string): AppPage {
  page.type = "wide";
  page.title = title;
  return page;
}

/**
 * Same as `wide` but with no margin to neighboring elements.
 */
export function fullPage(page: AppPage, title?: string): AppPage {
  page.type = "full";
  page.title = title;
  return page;
}

/**
 * Same as `full` but with no footer.
 */
export function barePage(page: AppPage, title?: string): AppPage {
  page.type = "bare";
  page.title = title;
  return page;
}
