import { middleware } from "./tServer";
import { TRPCError } from "@trpc/server";
import { isPermitted, Resource, Role } from "../shared/RBAC";
import User from "./database/models/User";
import invariant from "tiny-invariant";
import apiEnv from "./apiEnv";
import { UniqueConstraintError } from "sequelize";
import { AuthenticationClient } from 'authing-js-sdk'

const auth = (resource: Resource) => middleware(async ({ ctx, next }) => {
  const authingUser = ctx.authToken ? await getAuthingUser(ctx.authToken) : null;  
  if (!authingUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Please login first',
    });
  }

  // We only allow email-based accounts. If this line fails, check authing.cn configuration.
  invariant(authingUser.email);
  const user = await findOrCreateUser(authingUser.id, authingUser.email);

  if (!isPermitted(user.roles, resource)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Permission denied',
    });
  }
  
  return await next({
    ctx: {
      user,
      authingUser: authingUser,
    }
  });
});

export default auth;

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
   * Frontend calls user.profile multiple times when a new user logs in, causing parallel User.create() from time to
   * time which results in unique constraint errors.
   * 
   * As a speed optimization, we simply retry on such errors instead of using pessimistic locking.
   * 
   * TODO: Fix the frontend to suppress unnecessary calls to user.profile.
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
  
