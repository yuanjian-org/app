import { inferAsyncReturnType } from '@trpc/server';
import initApiServer from "./initApiServer";
import { CreateNextContextOptions } from '@trpc/server/adapters/next';

export async function createContext({ req }: CreateNextContextOptions) {
  initApiServer();
  const authToken: string | undefined = req.headers['authorization']?.split(' ')[1];
  return { authToken: authToken };
}

export type Context = inferAsyncReturnType<typeof createContext>;
