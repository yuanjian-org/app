import { middleware } from "./trpc";
import { TRPCError } from "@trpc/server";
import Role, { isPermitted } from "../shared/Role";
import db from "./database/db";
import invariant from "tiny-invariant";
import apiEnv from "./apiEnv";
import { userAttributes } from "./database/models/attributesAndIncludes";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

/**
 * Authenticate for APIs used by applications as opposed to end users. These applications should use
 * "Bearer ${INTEGRATION_AUTH_TOKEN}" as their authentican token.
 */
export const authIntegration = () => middleware(async ({ ctx, next }) => {
  const token: string | undefined = ctx.req.headers['authorization']?.split(' ')[1];

  if (!token) throw unauthorizedError();
  if (token !== apiEnv.INTEGRATION_AUTH_TOKEN) throw invalidTokenError();
  return await next({ ctx: { baseUrl: ctx.baseUrl } });
});

/**
 * Authenticate for APIs used by end users as opposed to integration applications.
 */
export const authUser = (permitted?: Role | Role[]) => middleware(async ({ ctx, next }) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session) throw unauthorizedError();
  const email = session.user?.email;
  invariant(email);

  // TODO: extend next-auth session data to include other user fields, and remove this extra call to db
  const user = await db.User.findOne({
    where: { email },
    attributes: userAttributes,
  });
  invariant(user);

  if (!isPermitted(user.roles, permitted)) throw forbiddenError();

  return await next({ ctx: { user, baseUrl: ctx.baseUrl } });
});

const unauthorizedError = () => new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Please login first',
});

const invalidTokenError = () => new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid authorization token',
});

const forbiddenError = () => new TRPCError({
  code: 'FORBIDDEN',
  message: 'Access denied',
});
