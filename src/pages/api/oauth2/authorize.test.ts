import request from "supertest";
import { expect } from "chai";
import sinon from "sinon";
import { testHandler } from "./testUtils";
import { decryptPayload } from "./utils";
import crypto from "crypto";
import Module from "module";

const originalRequire = Module.prototype.require;
const getServerSessionStub = sinon.stub();

// Intercept require to mock next-auth
Module.prototype.require = function (id: string, ...rest: any[]) {
  if (id === "next-auth") {
    return {
      getServerSession: getServerSessionStub,
      __esModule: true,
    };
  }
  return originalRequire.apply(this, [id, ...rest] as any);
};

// Now import authorizeHandler AFTER we patched require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const authorizeHandler = require("./authorize").default;

// Restore require back to normal so we don't break other tests
Module.prototype.require = originalRequire;

describe("OAuth2 authorize endpoint", () => {
  let server: any;

  const mockEnv = {
    OAUTH2_CLIENT_ID: "test-client-id",
    OAUTH2_REDIRECT_URI: "https://test.client.com/callback",
    NEXTAUTH_SECRET: "12345678901234567890123456789012",
  };

  let originalEnv: NodeJS.ProcessEnv;

  before(() => {
    server = testHandler(authorizeHandler);
  });

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };
    getServerSessionStub.reset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should block unsupported method (PUT)", async () => {
    const res = await request(server).put("/api/oauth2/authorize");
    expect(res.status).to.equal(405);
    expect(res.headers.allow).to.include("GET");
  });

  it("should block if OAuth2 Provider is not configured", async () => {
    delete process.env.OAUTH2_CLIENT_ID;
    const res = await request(server).get("/api/oauth2/authorize");
    expect(res.status).to.equal(500);
    expect(res.body.error).to.equal("OAuth2 Provider not configured.");
  });

  it("should return invalid_client if client_id is missing or incorrect", async () => {
    const res = await request(server).get(
      "/api/oauth2/authorize?client_id=wrong-id",
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_client");
  });

  it("should return unsupported_response_type if response_type is not code", async () => {
    const res = await request(server).get(
      `/api/oauth2/authorize?client_id=${mockEnv.OAUTH2_CLIENT_ID}&response_type=token`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("unsupported_response_type");
  });

  it("should return invalid_request if redirect_uri is missing or incorrect", async () => {
    const res = await request(server).get(
      `/api/oauth2/authorize?client_id=${mockEnv.OAUTH2_CLIENT_ID}&response_type=code&redirect_uri=https://wrong.uri/callback`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
    expect(res.body.error_description).to.include("redirect_uri");
  });

  it("should return invalid_request if PKCE code_challenge is provided but method is not S256", async () => {
    const res = await request(server).get(
      `/api/oauth2/authorize?client_id=${mockEnv.OAUTH2_CLIENT_ID}&response_type=code&redirect_uri=${mockEnv.OAUTH2_REDIRECT_URI}&code_challenge=123&code_challenge_method=plain`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
    expect(res.body.error_description).to.include("S256");
  });

  it("should redirect to login with callbackUrl if user is not logged in", async () => {
    getServerSessionStub.resolves(null);

    const res = await request(server)
      .get(
        `/api/oauth2/authorize?client_id=${mockEnv.OAUTH2_CLIENT_ID}&response_type=code&redirect_uri=${mockEnv.OAUTH2_REDIRECT_URI}`,
      )
      .set("Host", "localhost:3000");

    expect(res.status).to.equal(302);
    expect(res.headers.location).to.include("/auth/login?callbackUrl=");

    const locationUrl = new URL(res.headers.location);
    const callbackUrlStr = locationUrl.searchParams.get("callbackUrl");
    expect(callbackUrlStr).to.not.equal(null);
    const callbackUrl = new URL(callbackUrlStr!);
    expect(callbackUrl.pathname).to.equal("/api/oauth2/authorize");
  });

  it("should generate a valid authorization code and redirect to redirect_uri on success", async () => {
    const mockUserId = crypto.randomUUID();
    getServerSessionStub.resolves({ me: { id: mockUserId } });

    const state = "random-state-123";
    const nonce = "nonce-456";
    const codeChallenge = "challenge-789";

    const res = await request(server)
      .get(
        `/api/oauth2/authorize?client_id=${mockEnv.OAUTH2_CLIENT_ID}&response_type=code&redirect_uri=${mockEnv.OAUTH2_REDIRECT_URI}&state=${state}&nonce=${nonce}&code_challenge=${codeChallenge}&code_challenge_method=S256`,
      )
      .set("Host", "localhost:3000");

    expect(res.status).to.equal(302);
    expect(res.headers.location).to.satisfy((loc: string) =>
      loc.startsWith(mockEnv.OAUTH2_REDIRECT_URI),
    );

    const redirectUrl = new URL(res.headers.location);
    expect(redirectUrl.searchParams.get("state")).to.equal(state);

    const code = redirectUrl.searchParams.get("code");
    expect(code).to.not.equal(null);

    const payload = await decryptPayload(code!);
    expect(payload.type).to.equal("code");
    expect(payload.userId).to.equal(mockUserId);
    expect(payload.clientId).to.equal(mockEnv.OAUTH2_CLIENT_ID);
    expect(payload.redirectUri).to.equal(mockEnv.OAUTH2_REDIRECT_URI);
    expect(payload.codeChallenge).to.equal(codeChallenge);
    expect(payload.codeChallengeMethod).to.equal("S256");
    expect(payload.nonce).to.equal(nonce);
    expect(payload.jti).to.not.equal(undefined);
    expect(payload.exp).to.be.a("number");
  });
});
