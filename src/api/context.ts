import { inferAsyncReturnType } from '@trpc/server';
import initApiServer from "./initApiServer";
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import absoluteUrl from "next-absolute-url";

export async function createContext({ req }: CreateNextContextOptions) {
  initApiServer();
  const authToken: string | undefined = req.headers['authorization']?.split(' ')[1];
  const absolute = absoluteUrl(req);
  return { 
    authToken: authToken,
    host: absolute.host,
    protocol: absolute.protocol,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
