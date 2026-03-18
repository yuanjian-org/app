import * as trpcNext from "@trpc/server/adapters/next";
import { apiRouter } from "../../../api/apiRouter";
import { inferAsyncReturnType } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";

export function createContext({ req, res }: CreateNextContextOptions) {
  return {
    req,
    res,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;

// export API handler
// @see https://trpc.io/docs/api-handler
export default trpcNext.createNextApiHandler({
  router: apiRouter,
  createContext,
  onError({ error }) {
    console.error("Error:", error);
    if (error.code === "INTERNAL_SERVER_ERROR") {
      // TODO: send to bug reporting
    }
  },
});
