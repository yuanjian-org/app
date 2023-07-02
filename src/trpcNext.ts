import { httpBatchLink } from '@trpc/client';
import type { ApiRouter } from './api/apiRouter';
import { createTRPCNext } from "@trpc/next";
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

const trpcNext = createTRPCNext<ApiRouter>({
    config({ ctx }) {
      return {
        links: [
          httpBatchLink({
            /**
             * If you want to use SSR, you need to use the server's full URL
             * @link https://trpc.io/docs/ssr
             **/
            url: `${getBaseUrl()}/api/v1`,
            headers: () => {
              // console.log('getting headers', localStorage.getItem('_authing_token'));
              return {
                Authorization: `Bearer ${localStorage.getItem('_authing_token')}`,
              };
            },
            maxURLLength: 2083, // a suitable size
          }),
        ],
        /**
         * @link https://tanstack.com/query/v4/docs/reference/QueryClient
         **/
        // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
      };
    },
    /**
     * @link https://trpc.io/docs/ssr
     **/
    ssr: false,
});

export default trpcNext;
