import "../app.css";
import "react-toastify/dist/ReactToastify.css";
import "react-datepicker/dist/react-datepicker.css";

import { ChakraProvider } from "@chakra-ui/react";
import { AppProps } from "next/app";
import theme from "../theme";
import Head from "next/head";
import { trpcNext } from "../trpc";
import { appWithTranslation } from "next-i18next";
import type { UserConfig } from "next-i18next";
import nextI18NextConfig from "../../next-i18next.config.js";
import { ToastContainer } from "react-toastify";
import { SessionProvider } from "next-auth/react";
import { useRouter } from "next/router";
import AppPage from "AppPage";
import { isStaticPage, staticUrlPrefix } from "../static";
import StaticPageContainer from "components/StaticPageContainer";
import dynamic from "next/dynamic";
import ErrorBoundary from "fundebug/ErrorBoundary";
import "fundebug";

// Dynamically import SwitchBoard so authenticated layout/modals
// are not bundled into _app.js and downloaded on static routes.
const SwitchBoard = dynamic(() => import("components/SwitchBoard"));

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
          <StaticPageContainer pageType={Component.type}>
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

export default trpcNext.withTRPC(
  appWithTranslation(App, nextI18NextConfig as UserConfig),
);
