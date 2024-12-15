import { middleware } from "./trpc";
import { TRPCError } from "@trpc/server";
import Role, { isPermitted } from "../shared/Role";
import apiEnv from "./apiEnv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

/**
 * Authenticate for APIs used by applications as opposed to end users. Usage:
 *
 * $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
 *  "${BASE_URL}/api/v1/foo.bar"
 */
export const authIntegration = () => middleware(async ({ ctx, next }) => {
  const token: string | undefined = ctx.req.headers['authorization']
    ?.split(' ')[1];

  if (!token) throw unauthorizedError();
  if (token !== apiEnv.INTEGRATION_AUTH_TOKEN) throw invalidTokenError();
  return await next({ ctx: { baseUrl: ctx.baseUrl } });
});

/**
 * Authenticate for APIs used by end users as opposed to integration
 * applications.
 */
export const authUser = (permitted?: Role | Role[]) =>middleware(
  async ({ ctx, next }) => {
    const session = await getServerSession(ctx.req, ctx.res, authOptions(ctx.req));
    if (!session) throw unauthorizedError();

  if (!isPermitted(session.user.roles, permitted)) throw forbiddenError();

  return await next({ ctx: { user: session.user, baseUrl: ctx.baseUrl } });
});

const unauthorizedError = () => new TRPCError({
  code: 'UNAUTHORIZED',
  message: '请重新登录。',
});

const invalidTokenError = () => new TRPCError({
  code: 'BAD_REQUEST',
  message: '验证令牌无效。',
});

const forbiddenError = () => new TRPCError({
  code: 'FORBIDDEN',
  message: '禁止访问。',
});
