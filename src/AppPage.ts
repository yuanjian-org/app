import { NextPage } from "next";

type AppPage<P = {}, IP = P> = NextPage<P, IP> & {
  wide?: boolean,
}
export default AppPage;

/**
 * Occupy full screen width instead of leaving a broad margin on the right.
 */
export function widePage(page: AppPage): AppPage {
  page.wide = true;
  return page;
}
