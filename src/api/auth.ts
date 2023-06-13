import { middleware } from "./tServer";
import { TRPCError } from "@trpc/server";
import { isPermitted, Resource } from "../shared/RBAC";
import User from "./database/models/User";
import invariant from "tiny-invariant";

const auth = (resource: Resource) => middleware(async ({ ctx, next }) => {
  if (!ctx.authingUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Please login first',
    });
  }

  const yuanjianUser = await User.findOne({
    where: {
      clientId: ctx.authingUser.id
    }
  });

  if (!yuanjianUser) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No yuanjian user found',
    });
  }

  if (!isPermitted(yuanjianUser.roles, resource)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Permission denied',
    });
  }
  
  const email = ctx.authingUser.email;
  invariant(typeof email  === 'string');

  return await next({
    ctx: {
      authingUser: ctx.authingUser,
      email,
    }
  });
});

export default auth;
