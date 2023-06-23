import { middleware } from "./trpc";
import { TRPCError } from "@trpc/server";
import { isPermitted, Resource, Role } from "../shared/RBAC";
import User from "./database/models/User";
import invariant from "tiny-invariant";
import apiEnv from "./apiEnv";
import { UniqueConstraintError } from "sequelize";
import { AuthenticationClient } from 'authing-js-sdk'
import { LRUCache } from 'lru-cache'

const USER_CACHE_TTL_IN_MS = 60 * 60 * 1000

/**
 * Authenticate for APIs used by applications as opposed to end users. These applications should use
 * "Bearer ${INTEGRATION_AUTH_TOKEN}" as their authentican token.
 */
export const authIntegration = (resource: Resource) => middleware(async ({ ctx, next }) => {
  if (!ctx.authToken) throw noToken();
  if (ctx.authToken !== apiEnv.INTEGRATION_AUTH_TOKEN) throw invalidToken();
  if (!isPermitted(['INTEGRATION'], resource)) throw forbidden();
  return await next({ ctx: {} });
});

/**
 * Authenticate for APIs used by end users as opposed to integration applications. All end user auth tokens are
 * acquired from authing.cn.
 */
export const authUser = (resource: Resource) => middleware(async ({ ctx, next }) => {
  if (!ctx.authToken) throw noToken();
  const user = await userCache.fetch(ctx.authToken);
  invariant(user);
  if (!isPermitted(user.roles, resource)) throw forbidden();
  return await next({ ctx: { user: user } });
});

/**
 * In Serverless or Edge environment where multiple API instances may run, this function only clears the cache of the
 * current process.
 */
export function invalidateLocalUserCache() {
  userCache.clear();
}

const noToken = () => new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Please login first',
});

const invalidToken = () => new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid authorization token',
})

const forbidden = () => new TRPCError({
  code: 'FORBIDDEN',
  message: 'Access denied',
});

const userCache = new LRUCache<string, User>({
  max: 1000,
  ttl: USER_CACHE_TTL_IN_MS,
  updateAgeOnGet: true,

  fetchMethod: async(authToken: string) => {
    const start = Date.now();
    const authingUser = await getAuthingUser(authToken);
    if (!authingUser) throw invalidToken();

    const startUser = Date.now();
    // We only allow email-based accounts. If this line fails, check authing.cn configuration.
    invariant(authingUser.email);
    const user = await findOrCreateUser(authingUser.id, authingUser.email);
    const end = Date.now();

    console.log(`
      > User cache miss for '${user.email}'. Time spent in ms:
      >
      > getAuthingUser():   ${startUser - start}
      > findOrCreateUser(): ${end - startUser}
    `);
    return user;
  }
});

async function getAuthingUser(authToken: string) {
  const authing = new AuthenticationClient({
    appId: apiEnv.NEXT_PUBLIC_AUTHING_APP_ID,
    appHost: apiEnv.NEXT_PUBLIC_AUTHING_APP_HOST,
    token: authToken
  });
  return await authing.getCurrentUser();
}

async function findOrCreateUser(clientId: string, email: string): Promise<User> {  
  /**
   * Multiple APIs may be called at the same time, causing parallel User.create() calls from time to
   * time which results in unique constraint errors.
   * 
   * As a speed optimization, we simply retry on such errors instead of using pessimistic locking.
   */
  while (true) {
    const user = await User.findOne({ where: { clientId: clientId } });
    if (user) return user;

    const isAdmin = apiEnv.ASSIGN_ADMIN_ROLE_ON_SIGN_UP.includes(email);
    const roles: [Role] = [isAdmin ? 'ADMIN' : 'VISITOR'];
    console.log(`Creating user ${email} roles ${roles} id ${clientId}`);
    try {
      return await User.create({
        name: "",
        pinyin: "",
        email,
        clientId,
        roles,
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        console.log(`Unique constraint error when creating user ${email}. Assuming user already exists. Retry.`);
      } else {
        throw e;
      }
    }
  }
}
