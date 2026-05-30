import { initTRPC } from "@trpc/server";
import { Context } from "pages/api/v1/[trpc]";

const trpc = initTRPC.context<Context>().create({
  errorFormatter(opts) {
    const { shape, error, path } = opts;

    // For cron background tasks, we want to surface the actual underlying error
    // message (e.g., from a database or external API failure) instead of the
    // default "Internal Server Error" that tRPC uses to mask unhandled exceptions.
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
