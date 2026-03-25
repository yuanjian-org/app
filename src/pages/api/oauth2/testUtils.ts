import http from "http";
import url from "url";
import { apiResolver } from "next/dist/server/api-utils/node/api-resolver";

/**
 * Creates an HTTP server that wraps a Next.js API route handler,
 * allowing it to be tested with supertest.
 */
export function createTestServer(handler: any) {
  return http.createServer((req, res) => {
    // Manually parse query parameters since supertest does not do it automatically
    // and Next.js relies on them being populated.
    const query = url.parse(req.url!, true).query;

    return apiResolver(
      req,
      res,
      query,
      handler,
      {
        previewModeEncryptionKey: "",
        previewModeId: "",
        previewModeSigningKey: "",
      },
      true, // Disable resolving the request body again if already parsed
    );
  });
}
