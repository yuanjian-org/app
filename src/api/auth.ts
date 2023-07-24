import { middleware } from "./trpc";
import { TRPCError } from "@trpc/server";
import Role, { isPermitted } from "../shared/Role";
import { createUser } from "./database/models/User";
import db from "./database/db";
import invariant from "tiny-invariant";
import apiEnv from "./apiEnv";
import { UniqueConstraintError } from "sequelize";
import { AuthenticationClient } from 'authing-js-sdk';
import { LRUCache } from 'lru-cache';
import { emailRoleIgnoreError } from './sendgrid';
import User from "../shared/User";
import { userAttributes } from "./database/models/attributesAndIncludes";

const USER_CACHE_TTL_IN_MS = 60 * 60 * 1000

/**
 * Authenticate for APIs used by applications as opposed to end users. These applications should use
 * "Bearer ${INTEGRATION_AUTH_TOKEN}" as their authentican token.
 */
export const authIntegration = () => middleware(async ({ ctx, next }) => {
  if (!ctx.authToken) throw noTokenError();
  if (ctx.authToken !== apiEnv.INTEGRATION_AUTH_TOKEN) throw invalidTokenError();
  return await next({ ctx: { baseUrl: ctx.baseUrl } });
});

/**
 * Authenticate for APIs used by end users as opposed to integration applications. All end user auth tokens are
 * acquired from authing.cn.
 */
export const authUser = (permitted?: Role | Role[]) => middleware(async ({ ctx, next }) => {
  if (!ctx.authToken) throw noTokenError();
  const user = await userCache.fetch(ctx.authToken, { context: { baseUrl: ctx.baseUrl } });
  invariant(user);
  if (!isPermitted(user.roles, permitted)) throw forbiddenError();
  return await next({ ctx: { user, baseUrl: ctx.baseUrl } });
});

/**
 * In Serverless or Edge environment where multiple API instances may run, this function only clears the cache of the
 * current process.
 */
export function invalidateLocalUserCache() {
  userCache.clear();
}

const noTokenError = () => new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Please login first',
});

const invalidTokenError = () => new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid authorization token',
})

const forbiddenError = () => new TRPCError({
  code: 'FORBIDDEN',
  message: 'Access denied',
});

const userCache = new LRUCache<string, User, { baseUrl: string }>({
  max: 1000,
  ttl: USER_CACHE_TTL_IN_MS,
  updateAgeOnGet: true,

  fetchMethod: async (authToken: string, staleValue: any, { context }) => {
    const start = Date.now();
    const authingUser = await getAuthingUser(authToken);
    if (!authingUser) throw invalidTokenError();

    const startUser = Date.now();
    // We only allow email-based accounts. If this line fails, check authing.cn configuration.
    invariant(authingUser.email);
    const user = await findOrCreateUser(authingUser.email, context.baseUrl);
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

async function findOrCreateUser(email: string, baseUrl: string): Promise<User> {
  /**
   * Multiple API invocations may happen at the same time, causing parallel User.create() calls which results in unique
   * constraint errors.
   * 
   * As a speed optimization, we simply retry on such errors instead of using pessimistic locking.
   */
  while (true) {
    const user = await db.User.findOne({ 
      where: { email },
      attributes: userAttributes,
    });
    if (user) return user;

    // Set the first user as an admin
    const roles: Role[] = (await db.User.count()) == 0 ? ['UserManager'] : [];
    console.log(`Creating user ${email} roles ${roles}`);
    await emailRoleIgnoreError("UserManager", "新用户注册", `${email} 注册新用户 。`, baseUrl);
    try {
      return await createUser({ email, roles });
    } catch (e) {
      if (e instanceof UniqueConstraintError) {
        console.log(`Unique constraint error when creating user ${email}. Assuming user already exists. Retry.`);
      } else {
        throw e;
      }
    }
  }
}
  
