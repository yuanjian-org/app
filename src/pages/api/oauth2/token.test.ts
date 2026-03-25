import request from "supertest";
import { expect } from "chai";
import sinon from "sinon";
import { testHandler } from "./testUtils";
import { encryptPayload, decryptPayload } from "./utils";
import tokenHandler from "./token";
import crypto from "crypto";

describe("OAuth2 token endpoint", () => {
  const server = testHandler(tokenHandler);

  const mockEnv = {
    OAUTH2_CLIENT_ID: "test-client-id",
    OAUTH2_CLIENT_SECRET: "test-client-secret",
    OAUTH2_REDIRECT_URI: "https://test.client.com/callback",
    NEXTAUTH_SECRET: "12345678901234567890123456789012",
  };

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  it("should block unsupported method (GET)", async () => {
    const res = await request(server).get("/api/oauth2/token");
    expect(res.status).to.equal(405);
    expect(res.headers.allow).to.include("POST");
  });

  it("should return invalid_client if client credentials do not match", async () => {
    const res = await request(server).post("/api/oauth2/token").send({
      client_id: "wrong-id",
      client_secret: "wrong-secret",
    });
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_client");
  });

  it("should support client credentials via Basic Auth header", async () => {
    const credentials = Buffer.from(
      `${mockEnv.OAUTH2_CLIENT_ID}:${mockEnv.OAUTH2_CLIENT_SECRET}`,
    ).toString("base64");

    // Test with missing redirect_uri but valid credentials to verify auth passes
    const res = await request(server)
      .post("/api/oauth2/token")
      .set("Authorization", `Basic ${credentials}`)
      .send({});

    // Because auth passes, we should hit the redirect_uri error next
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
    expect(res.body.error_description).to.include("redirect_uri");
  });

  it("should return invalid_grant if redirect_uri is incorrect", async () => {
    const res = await request(server).post("/api/oauth2/token").send({
      client_id: mockEnv.OAUTH2_CLIENT_ID,
      client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
      redirect_uri: "https://wrong.uri/callback",
    });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
  });

  it("should return unsupported_grant_type if grant_type is not authorization_code", async () => {
    const res = await request(server).post("/api/oauth2/token").send({
      client_id: mockEnv.OAUTH2_CLIENT_ID,
      client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
      redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
      grant_type: "client_credentials",
    });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("unsupported_grant_type");
  });

  it("should return invalid_request if code is missing", async () => {
    const res = await request(server).post("/api/oauth2/token").send({
      client_id: mockEnv.OAUTH2_CLIENT_ID,
      client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
      redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
      grant_type: "authorization_code",
    });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
    expect(res.body.error_description).to.include("Missing code");
  });

  it("should return invalid_grant if code payload type is not code (JWT type confusion)", async () => {
    // Maliciously encrypt an access token and pass it as an authorization code
    const invalidCodePayload = {
      type: "access", // Type confusion
      userId: "test-user-id",
      clientId: mockEnv.OAUTH2_CLIENT_ID,
    };
    const invalidCode = await encryptPayload(invalidCodePayload);

    const res = await request(server).post("/api/oauth2/token").send({
      client_id: mockEnv.OAUTH2_CLIENT_ID,
      client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
      redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
      grant_type: "authorization_code",
      code: invalidCode,
    });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
    expect(res.body.error_description).to.include(
      "expected authorization code",
    );
  });

  it("should return invalid_grant if code was issued for a different client", async () => {
    const invalidCodePayload = {
      type: "code",
      userId: "test-user-id",
      clientId: "different-client-id",
    };
    const code = await encryptPayload(invalidCodePayload);

    const res = await request(server).post("/api/oauth2/token").send({
      client_id: mockEnv.OAUTH2_CLIENT_ID,
      client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
      redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
    expect(res.body.error_description).to.include("different client");
  });

  it("should require and validate PKCE code_verifier if code challenge is present", async () => {
    const codeVerifier = "my-secret-verifier";
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const codePayload = {
      type: "code",
      userId: "test-user-id",
      clientId: mockEnv.OAUTH2_CLIENT_ID,
      codeChallenge,
    };
    const code = await encryptPayload(codePayload);

    // 1. Missing verifier
    const resNoVerifier = await request(server).post("/api/oauth2/token").send({
      client_id: mockEnv.OAUTH2_CLIENT_ID,
      client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
      redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    });

    expect(resNoVerifier.status).to.equal(400);
    expect(resNoVerifier.body.error).to.equal("invalid_request");

    // 2. Invalid verifier
    const resInvalidVerifier = await request(server)
      .post("/api/oauth2/token")
      .send({
        client_id: mockEnv.OAUTH2_CLIENT_ID,
        client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
        redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
        grant_type: "authorization_code",
        code,
        code_verifier: "wrong-verifier",
      });

    expect(resInvalidVerifier.status).to.equal(400);
    expect(resInvalidVerifier.body.error).to.equal("invalid_grant");
  });

  it("should return access_token and id_token and prevent code reuse on success", async () => {
    const codeVerifier = "my-secret-verifier";
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const userId = "test-user-id";
    const nonce = "test-nonce-123";

    const codePayload = {
      type: "code",
      userId,
      clientId: mockEnv.OAUTH2_CLIENT_ID,
      codeChallenge,
      nonce,
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    // Initial valid exchange
    const res = await request(server)
      .post("/api/oauth2/token")
      .set("Host", "localhost:3000")
      .send({
        client_id: mockEnv.OAUTH2_CLIENT_ID,
        client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
        redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
      });

    expect(res.status).to.equal(200);
    expect(res.body.access_token).to.not.equal(undefined);
    expect(res.body.id_token).to.not.equal(undefined);
    expect(res.body.token_type).to.equal("Bearer");
    expect(res.body.expires_in).to.equal(3600);

    // Verify access token
    const accessTokenPayload = await decryptPayload(res.body.access_token);
    expect(accessTokenPayload.type).to.equal("access");
    expect(accessTokenPayload.userId).to.equal(userId);
    expect(accessTokenPayload.clientId).to.equal(mockEnv.OAUTH2_CLIENT_ID);

    // Reuse the same code
    const reuseRes = await request(server)
      .post("/api/oauth2/token")
      .set("Host", "localhost:3000")
      .send({
        client_id: mockEnv.OAUTH2_CLIENT_ID,
        client_secret: mockEnv.OAUTH2_CLIENT_SECRET,
        redirect_uri: mockEnv.OAUTH2_REDIRECT_URI,
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
      });

    expect(reuseRes.status).to.equal(400);
    expect(reuseRes.body.error).to.equal("invalid_grant");
    expect(reuseRes.body.error_description).to.include("already used");
  });
});
