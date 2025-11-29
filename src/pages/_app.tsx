import "../app.css";
import "react-toastify/dist/ReactToastify.min.css";
import "react-datepicker/dist/react-datepicker.css";

import { ChakraProvider } from "@chakra-ui/react";
import { AppProps } from "next/app";
import { PropsWithChildren } from "react";
import theme from "../theme";
import Head from "next/head";
import { trpcNext } from "../trpc";
import { ToastContainer } from "react-toastify";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/router";
import invariant from "tiny-invariant";
import PageLoader from "components/PageLoader";
import AppPageContainer from "components/AppPageContainer";
import AuthPageContainer from "components/AuthPageContainer";
import AppPage, { AppPageType } from "AppPage";
import { isStaticPage, staticUrlPrefix } from "../static";
import StaticPageContainer from "components/StaticPageContainer";
import { loginUrl } from "./auth/login";
import ErrorBoundary from "fundebug/ErrorBoundary";
import "fundebug"; // Initialize Fundebug

function App({
  Component,
  pageProps: { session, ...pageProps },
}: {
  Component: AppPage;
} & AppProps) {
  const router = useRouter();

  const subtitle =
    typeof Component.title === "function"
      ? Component.title(pageProps)
      : typeof Component.title === "string"
        ? Component.title
        : null;

  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>
          {(subtitle ? subtitle + " | " : "") + "远图 - 社会导师服务平台"}
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </Head>

      <ErrorBoundary>
        {isStaticPage(router.route) ? (
          <StaticPageContainer>
            <Component {...pageProps} />
          </StaticPageContainer>
        ) : (
          <SessionProvider session={session}>
            <SwitchBoard pageType={Component.type}>
              <Component {...pageProps} />
              <ToastContainer
                position="bottom-center"
                autoClose={5000}
                hideProgressBar
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
              />
            </SwitchBoard>
          </SessionProvider>
        )}
      </ErrorBoundary>
    </ChakraProvider>
  );
}

export default trpcNext.withTRPC(App);

function SwitchBoard({
  children,
  pageType,
}: {
  pageType?: AppPageType;
} & PropsWithChildren) {
  const { status } = useSession();
  const router = useRouter();

  // Invariant guaranteed by the caller
  invariant(!isStaticPage(router.route));
  const isAuthPage = router.route.startsWith("/auth/");

  if (status == "loading") {
    return <PageLoader />;
  } else if (status == "unauthenticated") {
    if (isAuthPage) {
      return <AuthPageContainer>{children}</AuthPageContainer>;

      // Redirect to static page if the user attempts to access the home page, ...
    } else if (router.asPath === "/") {
      void router.push(staticUrlPrefix);
      return null;

      // ... and redirect to login if they attempt to access specific sub-pages.
    } else {
      void router.push(loginUrl(router.asPath));
      return null;
    }
  } else {
    invariant(status == "authenticated");
    if (isAuthPage) {
      void router.replace("/");
      return null;
    } else {
      return (
        <AppPageContainer pageType={pageType}>{children}</AppPageContainer>
      );
    }
  }
}
