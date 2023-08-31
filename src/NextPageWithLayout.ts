import { NextPage } from "next";
import { ReactElement, ReactNode } from "react";

// TODO: Remove this type
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}
