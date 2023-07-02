import { createTRPCProxyClient, httpBatchLink, loggerLink } from '@trpc/client';
import type { ApiRouter } from './api/apiRouter';
import { requestFinishLink } from "./requestFinishLink";

function getBaseUrl() {
  // browser should use relative path
  if (typeof window !== 'undefined') return '';
  // vercel.com
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // render.com
  if (process.env.RENDER_INTERNAL_HOSTNAME) return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`;
  // fall back to localhost    
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const links = [
  ...(process.env.NODE_ENV === "production" ? [] : [loggerLink()]),
  requestFinishLink(),
  httpBatchLink({
    url: getBaseUrl() + '/api/v1',
    headers: () => {
      return {
        Authorization: `Bearer ${localStorage.getItem('_authing_token')}`,
      };
    },
    maxURLLength: 2083, // a suitable size
  }),
];

const trpc = createTRPCProxyClient<ApiRouter>({ links });

export default trpc;
