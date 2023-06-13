import { createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import type { ApiRouter } from './api/apiRouter';
import { requestFinishLink } from "./requestFinishLink";

function getBaseUrl() {
  if (typeof window !== 'undefined')
    // browser should use relative path
    return '';
  if (process.env.VERCEL_URL)
    // reference for vercel.com
    return `https://${process.env.VERCEL_URL}`;
  if (process.env.RENDER_INTERNAL_HOSTNAME)
    // reference for render.com
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  // assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const tClientBrowser = createTRPCProxyClient<ApiRouter>({
  links: [
    ...(process.env.NODE_ENV === "production" ? [] : [loggerLink()]),
    requestFinishLink(),
    httpBatchLink({
      url: getBaseUrl() + '/api/trpc',
      headers: () => {
        return {
          Authorization: `Bearer ${localStorage.getItem('_authing_token')}`,
        };
      },
      maxURLLength: 2083, // a suitable size
    }),
  ]
});

export default tClientBrowser;
