import { initTRPC } from "@trpc/server";
import { Context } from "pages/api/v1/[trpc]";

const trpc = initTRPC.context<Context>().create();

// Base router and procedure helpers
export const router = trpc.router;
export const procedure = trpc.procedure;
export const middleware = trpc.middleware;
