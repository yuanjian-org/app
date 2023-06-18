import { inferAsyncReturnType } from '@trpc/server';
import * as trpcNext from '@trpc/server/adapters/next';

import { AuthenticationClient } from 'authing-js-sdk'
import apiEnv from "./apiEnv";
import initApiServer from "./initApiServer";

export async function createContext({ req }: trpcNext.CreateNextContextOptions) {
  await initApiServer();
  const user = await getUserFromHeader(req.headers['authorization']);
  return { authingUser: user };
}

// Create context that will be available as `ctx` in all resolvers.
async function getUserFromHeader(authHeader: string | undefined) {
  const authingToken = authHeader?.split(' ')[1];
  if (authingToken) {
    const authing = new AuthenticationClient({
      appId: apiEnv.NEXT_PUBLIC_AUTHING_APP_ID,
      appHost: apiEnv.NEXT_PUBLIC_AUTHING_APP_HOST,
      token: authingToken
    });
    return await authing.getCurrentUser();
  } else {
    return null;
  }
}

export type Context = inferAsyncReturnType<typeof createContext>;
