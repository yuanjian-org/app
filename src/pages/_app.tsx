import '../app.css';
import 'react-toastify/dist/ReactToastify.min.css';

import { ChakraProvider, Flex } from '@chakra-ui/react';
import { AppProps } from 'next/app';
import React, { Component, PropsWithChildren, ReactNode } from 'react';
import theme from '../theme';
import Head from 'next/head';
import { trpcNext } from "../trpc";
import { NextPageWithLayout } from "../NextPageWithLayout";
import { ToastContainer } from "react-toastify";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from 'next/router';
import invariant from "tiny-invariant";
import AppLayout from 'AppLayout';
import PageLoader from 'components/PageLoader';
import AuthPageContainer from 'components/AuthPageContainer';

function App({ Component, pageProps: { session, ...pageProps } }: {
  Component: NextPageWithLayout,
} & AppProps) {

  return (
    <SessionProvider session={session}>
      <ChakraProvider theme={theme}>
        <Head>
          <title>远图</title>
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <meta name='theme-color' content='#000000' />
        </Head>

        <SwitchBoard {...pageProps}>
          <Component />
        </SwitchBoard>

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
      </ChakraProvider>
    </SessionProvider>
  );
}

export default trpcNext.withTRPC(App);

function SwitchBoard({ children, ...rest }: PropsWithChildren) {
  // TODO: combine what userSession().data returns and our own User object.
  const { status } = useSession();
  const router = useRouter();

  const isAuthPage = router.asPath.startsWith("/auth/");

  if (status == "loading") {
    return <PageLoader />;
  } else if (status == "unauthenticated") {
    if (isAuthPage) {
      return <AuthPageContainer {...rest}>{children}</AuthPageContainer>;
    } else {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    }
  } else {
    invariant(status == "authenticated");
    if (isAuthPage) {
      router.replace("/");
    } else {
      return <AppLayout {...rest}>{children}</AppLayout>;
    }
  }
}
