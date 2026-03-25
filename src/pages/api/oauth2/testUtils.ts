import { createServer, RequestListener } from "http";
import { apiResolver } from "next/dist/server/api-utils/node/api-resolver";
import * as url from "url";

/**
 * Creates a standard Node.js HTTP server for Next.js API route handlers to be used with Supertest.
 * Uses Next.js internal apiResolver to parse queries and body correctly.
 */
export function testHandler(handler: any) {
  const wrappedHandler = async (req: any, res: any) => {
    // Supertest doesn't populate req.query, but next.js expects it if not using apiResolver correctly
    const parsedUrl = url.parse(req.url, true);
    req.query = parsedUrl.query;
    req.cookies = req.cookies || {};
    await handler(req, res);
  };

  const listener: RequestListener = (req, res) => {
    return apiResolver(
      req,
      res,
      undefined,
      wrappedHandler,
      {
        previewModeEncryptionKey: "",
        previewModeId: "",
        previewModeSigningKey: "",
      } as any,
      false,
    ).catch((err) => {
      console.error("Test handler error:", err);
      res.statusCode = 500;
      res.end();
    });
  };
  return createServer(listener);
}
