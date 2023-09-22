import '../app.css';
import 'react-toastify/dist/ReactToastify.min.css';

import { ChakraProvider } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import React, { PropsWithChildren } from 'react';
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
import AppPage from 'AppPage';

function App({ Component, pageProps: { session, ...pageProps } }: {
  Component: AppPage,
} & AppProps) {
  return (
    <SessionProvider session={session}>
      <ChakraProvider theme={theme}>
        <Head>
          <title>远图</title>
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <meta name='theme-color' content='#000000' />
        </Head>

        <SwitchBoard wide={Component.wide} {...pageProps}>
          <Component />
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
            theme="light"
          />
        </SwitchBoard>
      </ChakraProvider>
    </SessionProvider>
  );
}

export default trpcNext.withTRPC(App);

function SwitchBoard({ children, wide, ...rest }: PropsWithChildren & { wide: boolean}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthPage = router.asPath.startsWith("/auth/");

  if (status == "loading") {
    return <PageLoader />;
  } else if (status == "unauthenticated") {
    if (isAuthPage) {
      return <AuthPageContainer {...rest}>{children}</AuthPageContainer>;
    } else {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
      return null;
    }
  } else {
    invariant(status == "authenticated");
    if (isAuthPage) {
      router.replace("/");
      return null;
    } else {
      return <AppPageContainer wide={wide} user={session.user} {...rest}>{children}</AppPageContainer>;
    }
  }
}
