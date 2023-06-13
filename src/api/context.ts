import { inferAsyncReturnType } from '@trpc/server';
import * as trpcNext from '@trpc/server/adapters/next';

import { AuthenticationClient } from 'authing-js-sdk'
import apiEnv from "./apiEnv";
import initApiServer from "./initApiServer";

export async function createContext({
                                      req,
                                      res,
                                    }: trpcNext.CreateNextContextOptions) {
  // Create context based on the request object
  // Will be available as `ctx` in all resolvers
  async function getUserFromHeader() {
    const authingToken = req.headers['authorization']?.split(' ')[1];
    if (authingToken) {
      const authing = new AuthenticationClient({
        appId: apiEnv.NEXT_PUBLIC_AUTHING_APP_ID,
        appHost: apiEnv.NEXT_PUBLIC_AUTHING_APP_HOST,
        token: authingToken
      });

      return await authing.getCurrentUser();
    }
    return null;
  }
  const user = await getUserFromHeader();

  await initApiServer();

  return {
    authingUser: user,
  };
}
export type Context = inferAsyncReturnType<typeof createContext>;
