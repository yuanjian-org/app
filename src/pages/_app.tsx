import { ChakraProvider } from '@chakra-ui/react'
import { AppProps } from 'next/app'
import React from 'react'
import theme from 'horizon-ui/theme/theme'
import Head from 'next/head'
import trpcNext from "../trpcNext";
import { NextPageWithLayout } from "../NextPageWithLayout";
import { ToastContainer } from "react-toastify";

import '../app.css'
import 'horizon-ui/styles/Fonts.css'
import 'react-toastify/dist/ReactToastify.min.css';

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

function MyApp ({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout || (page => page)

  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>远见教育平台</title>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='#000000' />
      </Head>
      {getLayout(<Component {...pageProps}></Component>)}
      <ToastContainer
        position="bottom-left"
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
  )
}

export default trpcNext.withTRPC(MyApp);
