import { ChakraProvider } from '@chakra-ui/react'
import { AppProps } from 'next/app'
import React from 'react'
import theme from 'horizon-ui/theme/theme'

import 'horizon-ui/styles/Fonts.css'
import 'horizon-ui/styles/App.css'
import 'horizon-ui/styles/Contact.css'

import 'react-calendar/dist/Calendar.css'
import 'horizon-ui/styles/MiniCalendar.css'
import Head from 'next/head'
import tClientNext from "../tClientNext";
import { NextPageWithLayout } from "../NextPageWithLayout";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.min.css';

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

function MyApp ({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout || (page => page)

  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>远见</title>
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='theme-color' content='#000000' />
      </Head>
      {getLayout(<Component {...pageProps}></Component>)}
      <ToastContainer position={'bottom-right'} hideProgressBar />
    </ChakraProvider>
  )
}

export default tClientNext.withTRPC(MyApp);
