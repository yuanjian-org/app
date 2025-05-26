import '../app.css';
import 'react-toastify/dist/ReactToastify.min.css';
import "react-datepicker/dist/react-datepicker.css";

import { ChakraProvider } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import { PropsWithChildren } from 'react';
import theme from '../theme';
import Head from 'next/head';
import { trpcNext } from "../trpc";
import { ToastContainer } from "react-toastify";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from 'next/router';
import invariant from "tiny-invariant";
import PageLoader from 'components/PageLoader';
import AppPageContainer from 'components/AppPageContainer';
import AuthPageContainer from 'components/AuthPageContainer';
import AppPage, { AppPageType } from 'AppPage';
import { isStaticPage, staticUrlPrefix } from '../static';
import StaticPageContainer from 'components/StaticPageContainer';
import { loginUrl } from './auth/login';
import getBaseUrl from 'shared/getBaseUrl';

function App({ Component, pageProps: { session, ...pageProps } }: {
  Component: AppPage,
} & AppProps) {
  const router = useRouter();

  // Application-level URL redirection. Sometimes it's just easier to redirect
  // at the application level than at lower levels.
  if (typeof window !== 'undefined' && process.env.NODE_ENV == "production") {
    const base = getBaseUrl();

    // We configured yuanjian.org to point to a free-tier vercel.com instance to
    // redirect this domain to yjjxj.cn for free. It accepts "www.yunajian.org"
    // and anything that ends with "yuanjian.org" like "hackingyuanjian.org".
    // Being over zealous here isn't a security risk.
    if (base.endsWith("yuanjian.org")) {
      void router.replace(`https://www.yjjxj.cn${router.asPath}`);
      return <></>;

    // Always direct to mentors.org.cn if it's a production environment and
    // is not hosted on mentors.org.cn or vercel.com (for testing purposes).
    } else if (base !== "https://mentors.org.cn" && !base.endsWith(".vercel.app")) {
      void router.replace(`https://mentors.org.cn/${router.asPath}`);
      return <></>;
    }
  }

  const subtitle = typeof Component.title === 'function' ?
    Component.title(pageProps) : typeof Component.title === 'string' ?
    Component.title : null;

  return <ChakraProvider theme={theme}>
    <Head>
      <title>{(subtitle ? subtitle + " | " : "") + "社会导师服务平台"}</title>
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <meta name='theme-color' content='#000000' />
    </Head>

    {isStaticPage(router.route) ?
      <StaticPageContainer>
        <Component {...pageProps} />
      </StaticPageContainer>
      :
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
    }
    </ChakraProvider>;
}

export default trpcNext.withTRPC(App);


function SwitchBoard({ children, pageType }: {
  pageType?: AppPageType
} & PropsWithChildren)
{
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
      return <AppPageContainer pageType={pageType}>
        {children}
      </AppPageContainer>;
    }
  }
}
