import { Html, Head, Main, NextScript } from 'next/document'

export default function Document () {
  return (
    <Html lang='zh-cn'>
      <Head>
        <link rel='manifest' href='/manifest.json' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <body id='root'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
