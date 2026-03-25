import { middleware } from "./trpc";
import proxyaddr from "proxy-addr";

/**
 * Attach client IP address to the context. Cannot be used in combination with
 * auth*().
 */
export const ip = () =>
  middleware(async ({ ctx, next }) => {
    // Determine the trusted proxies from the environment, defaulting to local
    // loopback and local networks
    const trustedProxies = process.env.TRUSTED_PROXIES
      ? process.env.TRUSTED_PROXIES.split(",").map((s) => s.trim())
      : ["loopback", "linklocal", "uniquelocal"];
    let clientIp: string | undefined;

    try {
      // Use proxy-addr to securely parse X-Forwarded-For by validating against
      // trusted proxies. NOTE: proxy-addr works with standard node
      // IncomingMessage request objects.
      clientIp = proxyaddr(ctx.req, trustedProxies);
    } catch {
      // Fallback in case of parse error
      clientIp = ctx.req.connection.remoteAddress;
    }

    console.log(
      `ip() middleware resolved client IP: ${clientIp} | X-Forwarded-For: ${ctx.req.headers["x-forwarded-for"]} | remoteAddress: ${ctx.req.connection?.remoteAddress}`,
    );

    return await next({
      ctx: {
        ...ctx,
        ip: clientIp,
      },
    });
  });
