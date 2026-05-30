import { initTRPC } from "@trpc/server";
import { Context } from "pages/api/v1/[trpc]";

const trpc = initTRPC.context<Context>().create({
  errorFormatter(opts) {
    const { shape, error, path } = opts;
    if (path?.startsWith("cron.")) {
      return {
        ...shape,
        message:
          error.cause instanceof Error ? error.cause.message : error.message,
      };
    }
    return shape;
  },
});

// Base router and procedure helpers
export const router = trpc.router;
export const procedure = trpc.procedure;
export const middleware = trpc.middleware;
