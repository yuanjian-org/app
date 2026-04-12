import { expect } from "chai";
import * as sinon from "sinon";
import { createServer } from "http";
import request from "supertest";
import { apiResolver } from "next/dist/server/api-utils/node/api-resolver";
import url from "url";
import handler from "./logout";

describe("OAuth2 /api/oauth2/logout API Endpoint", function () {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Basic setup for tests
    process.env.OAUTH2_REDIRECT_URI =
      "https://demo.yuantuapp.com/api/auth/callback/yuantu-sso";
    process.env.NEXTAUTH_URL = "https://yuantuapp.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    sinon.restore();
  });

  const requestListener = async (req: any, res: any) => {
    try {
      // supertest does not automatically parse the query string, but apiResolver requires it
      req.query = url.parse(req.url, true).query;

      await apiResolver(
        req,
        res,
        req.query,
        handler,
        {
          previewModeEncryptionKey: "",
          previewModeId: "",
          previewModeSigningKey: "",
        },
        true,
      );
    } catch (err: any) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  };

  const app = createServer(requestListener);

  it("should return 405 for methods other than GET or POST", async () => {
    const res = await request(app).put("/");
    expect(res.status).to.equal(405);
    expect(res.text).to.include("Method PUT Not Allowed");
  });

  it("should successfully log out and redirect to post_logout_redirect_uri when valid", async () => {
    const targetUrl = "https://demo.yuantuapp.com/post-logout";

    const res = await request(app).get(
      `/?post_logout_redirect_uri=${encodeURIComponent(targetUrl)}`,
    );

    expect(res.status).to.equal(302);
    expect(res.header.location).to.equal(targetUrl);

    // Check if secure cookies are cleared correctly
    const setCookie = res.header["set-cookie"];
    expect(setCookie).to.be.an("array");
    expect(setCookie).to.have.lengthOf(3);

    expect(setCookie[0]).to.include("__Secure-next-auth.session-token=;");
    expect(setCookie[0]).to.include("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie[0]).to.include("Secure");

    expect(setCookie[1]).to.include("__Host-next-auth.csrf-token=;");
    expect(setCookie[2]).to.include("__Secure-next-auth.callback-url=;");
  });

  it("should fallback to root path when post_logout_redirect_uri origin does not match OAUTH2_REDIRECT_URI", async () => {
    const maliciousUrl = "https://evil.com/post-logout";

    const res = await request(app).get(
      `/?post_logout_redirect_uri=${encodeURIComponent(maliciousUrl)}`,
    );

    expect(res.status).to.equal(302);
    expect(res.header.location).to.equal("/");
  });

  it("should log out and redirect to root when post_logout_redirect_uri is missing", async () => {
    const res = await request(app).post("/");

    expect(res.status).to.equal(302);
    expect(res.header.location).to.equal("/");

    const setCookie = res.header["set-cookie"];
    expect(setCookie).to.be.an("array");
    expect(setCookie).to.have.lengthOf(3);
    expect(setCookie[0]).to.include("__Secure-next-auth.session-token=;");
  });

  it("should use secure cookies if NEXTAUTH_URL is https", async () => {
    process.env.NEXTAUTH_URL = "https://localhost:3000";

    const res = await request(app).get("/");

    expect(res.status).to.equal(302);
    expect(res.header.location).to.equal("/");

    const setCookie = res.header["set-cookie"];
    expect(setCookie).to.be.an("array");
    expect(setCookie[0]).to.include("__Secure-next-auth.session-token=;");
    expect(setCookie[0]).to.include("Secure");
  });

  it("should clear non-secure cookies when protocol is HTTP and NEXTAUTH_URL is undefined", async () => {
    delete process.env.NEXTAUTH_URL;

    const res = await request(app).get("/");

    expect(res.status).to.equal(302);
    expect(res.header.location).to.equal("/");

    const setCookie = res.header["set-cookie"];
    expect(setCookie).to.be.an("array");
    expect(setCookie).to.have.lengthOf(3);

    // It should not use the __Secure- or __Host- prefixes
    expect(setCookie[0]).to.include("next-auth.session-token=;");
    expect(setCookie[0]).to.not.include("__Secure-");
    expect(setCookie[0]).to.not.include("Secure");
  });

  it("should clear non-secure cookies when protocol is HTTP", async () => {
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    const res = await request(app).get("/");

    expect(res.status).to.equal(302);
    expect(res.header.location).to.equal("/");

    const setCookie = res.header["set-cookie"];
    expect(setCookie).to.be.an("array");
    expect(setCookie).to.have.lengthOf(3);

    // It should not use the __Secure- or __Host- prefixes
    expect(setCookie[0]).to.include("next-auth.session-token=;");
    expect(setCookie[0]).to.not.include("__Secure-");
    expect(setCookie[0]).to.not.include("Secure");

    expect(setCookie[1]).to.include("next-auth.csrf-token=;");
    expect(setCookie[1]).to.not.include("__Host-");

    expect(setCookie[2]).to.include("next-auth.callback-url=;");
  });
});
