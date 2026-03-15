import { middleware } from "./trpc";
import { TRPCError } from "@trpc/server";
import Role, { isPermitted } from "../shared/Role";
import apiEnv from "./apiEnv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import proxyaddr from "proxy-addr";

/**
 * Authenticate for APIs used by applications as opposed to end users. Usage:
 *
 * $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
 *  "${BASE_URL}/api/v1/foo.bar"
 */
export const authIntegration = () =>
  middleware(async ({ ctx, next }) => {
    const token: string | undefined =
      ctx.req.headers["authorization"]?.split(" ")[1];

    if (!token) throw unauthorizedError();
    if (token !== apiEnv.INTEGRATION_AUTH_TOKEN) throw invalidTokenError();
    return await next({ ctx: { baseUrl: ctx.baseUrl } });
  });

/**
 * Authenticate for APIs used by end users as opposed to integration
 * applications.
 */
export const authUser = (permitted?: Role | Role[]) =>
  middleware(async ({ ctx, next }) => {
    const session = await getServerSession(
      ctx.req,
      ctx.res,
      authOptions(ctx.req),
    );
    if (!session) throw unauthorizedError();

    if (!isPermitted(session.user.roles, permitted)) throw forbiddenError();

    return await next({
      ctx: {
        me: session.user,
        // TODO: remove this field. Use getBaseUrl() instead.
        baseUrl: ctx.baseUrl,
        session,
      },
    });
  });

/**
 * Attach client IP address to the context. Cannot be used in combination with
 * auth*().
 */
export const ip = () =>
  middleware(async ({ ctx, next }) => {
    // Determine the trusted proxies from the environment, defaulting to local loopback and local networks
    const trustedProxies = process.env.TRUSTED_PROXIES
      ? process.env.TRUSTED_PROXIES.split(",").map((s) => s.trim())
      : ["loopback", "linklocal", "uniquelocal"];
    let clientIp: string | undefined;

    try {
      // Use proxy-addr to securely parse X-Forwarded-For by validating against trusted proxies.
      // NOTE: proxy-addr works with standard node IncomingMessage request objects.
      clientIp = proxyaddr(ctx.req, trustedProxies);
    } catch {
      // Fallback in case of parse error
      clientIp = ctx.req.connection.remoteAddress;
    }

    return await next({
      ctx: {
        ...ctx,
        ip: clientIp,
      },
    });
  });

const unauthorizedError = () =>
  new TRPCError({
    code: "UNAUTHORIZED",
    message: "请重新登录。",
  });

const invalidTokenError = () =>
  new TRPCError({
    code: "BAD_REQUEST",
    message: "验证令牌无效。",
  });

const forbiddenError = () =>
  new TRPCError({
    code: "FORBIDDEN",
    message: "禁止访问。",
  });
