import type { ApiRouter } from './api/apiRouter';
import { createTRPCNext } from "@trpc/next";
import { links } from './trpc';

const trpcNext = createTRPCNext<ApiRouter>({
    config({ ctx }) {
      return {
        links,
        // https://tanstack.com/query/v4/docs/reference/QueryClient
        // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
      };
    },
    // https://trpc.io/docs/ssr
    ssr: false,
});

export default trpcNext;
