import { initTRPC } from '@trpc/server';
import { Context } from "./context";
const tServer = initTRPC.context<Context>().create();

// Base router and procedure helpers
export const router = tServer.router;
export const procedure = tServer.procedure;
export const middleware = tServer.middleware;
