import "../app.css";
import "react-toastify/dist/ReactToastify.css";
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
import invariant from "shared/invariant";
import PageLoader from "components/PageLoader";
import AppPageContainer from "components/AppPageContainer";
import AppPage, { AppPageType } from "AppPage";
import { isStaticPage, staticUrlPrefix } from "../static";
import StaticPageContainer from "components/StaticPageContainer";
import { loginUrl, useCallbackUrl } from "./auth/login";
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

  if (router.pathname === "/s/yuanjian") {
    return (
      <ChakraProvider theme={theme}>
        <Head>
          <title>远见社会导师</title>
        </Head>
        <Component {...pageProps} />
      </ChakraProvider>
    );
  }

  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>
          {router.pathname === staticUrlPrefix
            ? "远图网"
            : (subtitle ? subtitle + " | " : "") + "远图"}
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
  const callbackUrl = useCallbackUrl();

  // Invariant guaranteed by the caller
  invariant(!isStaticPage(router.route), "non-static page");
  const isAuthPage = router.route.startsWith("/auth/");

  if (status == "loading") {
    return <PageLoader />;
  } else if (status == "unauthenticated") {
    if (isAuthPage) {
      console.log("Unauthenticated user on auth page, rendering children");
      return children;
    } else if (router.asPath === "/") {
      // Redirect to static page if the user attempts to access the home page.
      console.log(
        "Unauthenticated user on /, redirecting to static page:",
        staticUrlPrefix,
      );
      void router.push(staticUrlPrefix);
      return null;
    } else {
      // Redirect to login if they attempt to access specific sub-pages.
      console.log(
        "Unauthenticated user on sub-page, redirecting to login:",
        loginUrl(router.asPath),
      );
      void router.push(loginUrl(router.asPath));
      return null;
    }
  } else {
    invariant(status == "authenticated", "session status");
    if (isAuthPage) {
      console.log(
        "Authenticated user on auth page, redirecting to callbackUrl:",
        router.route,
        router.asPath,
        callbackUrl,
      );
      void router.replace(callbackUrl);
      return null;
    } else if (router.route === "/oauth2/profile") {
      // /oauth2/profile page doesn't need <AppPageContainer />
      console.log("Authenticated user on /oauth2/profile, rendering children");
      return children;
    } else {
      console.log(
        "Authenticated user on normal page, rendering AppPageContainer",
        router.route,
        pageType,
      );
      return (
        <AppPageContainer pageType={pageType}>{children}</AppPageContainer>
      );
    }
  }
}
