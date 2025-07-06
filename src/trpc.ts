import {
  TRPCClientError,
  TRPCLink,
  createTRPCProxyClient,
  httpBatchLink,
  loggerLink,
} from "@trpc/client";
import type { ApiRouter } from "./api/apiRouter";
import { observable } from "@trpc/server/observable";
import { toast } from "react-toastify";
import { createTRPCNext } from "@trpc/next";
import getBaseUrl from "shared/getBaseUrl";

/**
 * Show toasts on all TRPC errors.
 * https://trpc.io/docs/client/links#example
 */
const errorToastLink: TRPCLink<ApiRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          observer.next(value);
        },

        error(err: TRPCClientError<ApiRouter>) {
          console.log("TRPC got an error:", err);

          // Assume UI will manually handle this error.
          if (err.data?.code !== "CONFLICT") {
            // When Vercel's gateway times oute (504), it inserts the following
            // text in the response body which TRPC simply can't parse. When
            // this happens, TRPC also doesn't give us the HTTP status code.
            // https://vercel.com/docs/functions/runtimes#max-duration
            //
            //    An error occurred with your deployment
            //
            //    FUNCTION_INVOCATION_TIMEOUT
            //
            const msg =
              err.message ==
              `Unexpected token 'A', "An error o"... is not valid JSON`
                ? "服务器端超时，请稍后重试。"
                : `糟糕！${err.message}`;

            // Avoid multiple toasts with the same message.
            toast.error(msg, { toastId: msg });
          }
          observer.error(err);
        },

        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

export const links = [
  errorToastLink,
  ...(process.env.NODE_ENV === "production" ? [] : [loggerLink()]),
  httpBatchLink({
    url: getBaseUrl() + "/api/v1",
    headers: () => {
      return {
        Authorization: `Bearer ${localStorage.getItem("_authing_token")}`,
      };
    },
    maxURLLength: 2083, // a suitable size
  }),
];

const trpc = createTRPCProxyClient<ApiRouter>({ links });

export default trpc;

export const trpcNext = createTRPCNext<ApiRouter>({
  config(/*{ ctx }*/) {
    return {
      links,
      // https://tanstack.com/query/v4/docs/reference/QueryClient
      // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
    };
  },
  // https://trpc.io/docs/ssr
  ssr: false,
});
