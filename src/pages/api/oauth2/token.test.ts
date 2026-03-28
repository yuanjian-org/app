import { expect } from "chai";
import request from "supertest";
import crypto from "crypto";
import * as jose from "jose";
import { createTestServer } from "./testUtils";
import tokenHandler from "./token";
import { encryptPayload } from "./utils";

describe("OAuth2 tokenHandler", () => {
  let server: ReturnType<typeof createTestServer>;
  let originalEnv: NodeJS.ProcessEnv;

  before(() => {
    originalEnv = { ...process.env };
    server = createTestServer(tokenHandler);
  });

  after(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    process.env.OAUTH2_CLIENT_ID = "test-client";
    process.env.OAUTH2_CLIENT_SECRET = "test-client-secret";
    process.env.OAUTH2_REDIRECT_URI = "https://app.example.com/callback";
    process.env.NEXTAUTH_SECRET = "test-secret-1234567890";
    process.env.NEXTAUTH_URL = "https://provider.example.com";
  });

  it("should return 405 for methods other than POST", async () => {
    const res = await request(server).get("/");
    expect(res.status).to.equal(405);
  });

  it("should return 500 if provider is not configured", async () => {
    delete process.env.OAUTH2_CLIENT_ID;
    const res = await request(server).post("/").send({});
    expect(res.status).to.equal(500);
    expect(res.body.error).to.equal("OAuth2 Provider not configured.");
  });

  it("should authenticate client via body", async () => {
    const res = await request(server).post("/").send({
      client_id: "wrong-client",
      client_secret: "wrong-secret",
    });
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_client");
  });

  it("should authenticate client via Basic Auth header", async () => {
    const authString = Buffer.from("wrong-client:wrong-secret").toString(
      "base64",
    );
    const res = await request(server)
      .post("/")
      .set("Authorization", `Basic ${authString}`)
      .send({});
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_client");
  });

  it("should return 400 for mismatching redirect_uri", async () => {
    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://evil.com",
    });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
  });

  it("should return 400 for unsupported grant_type", async () => {
    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "password",
    });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("unsupported_grant_type");
  });

  it("should return 400 for missing code", async () => {
    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
    });
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should successfully exchange code for tokens without PKCE", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("access_token");
    expect(res.body).to.have.property("id_token");
    expect(res.body.token_type).to.equal("Bearer");
  });

  it("should fail to reuse the same code", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    // First request should succeed
    const res1 = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });
    expect(res1.status).to.equal(200);

    // Second request should fail
    const res2 = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });
    expect(res2.status).to.equal(400);
    expect(res2.body.error_description).to.equal(
      "Authorization code already used",
    );
  });

  it("should successfully exchange code with PKCE", async () => {
    const codeVerifier = "this-is-a-long-random-string-for-code-verifier-123";
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      codeChallenge,
      codeChallengeMethod: "S256",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    });

    expect(res.status).to.equal(200);
  });

  it("should fail exchange if PKCE verifier is wrong", async () => {
    const codeChallenge = crypto
      .createHash("sha256")
      .update("correct-verifier")
      .digest("base64url");

    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      codeChallenge,
      codeChallengeMethod: "S256",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
      code_verifier: "wrong-verifier",
    });

    expect(res.status).to.equal(400);
    expect(res.body.error_description).to.equal("Invalid code_verifier");
  });

  it("should fail if code type is not 'code' (JWT Type Confusion prevention)", async () => {
    // Generate an access token instead
    const codePayload = {
      type: "access",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });

    expect(res.status).to.equal(400);
    expect(res.body.error_description).to.include("Invalid token type");
  });

  it("should reject an expired authorization code", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      exp: Math.floor(Date.now() / 1000) - 1, // already expired
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
  });

  it("should reject a code issued for a different client", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "other-client", // different from request's test-client
      redirectUri: "https://app.example.com/callback",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_grant");
    expect(res.body.error_description).to.equal(
      "Code issued for a different client",
    );
  });

  it("should return 400 for missing code_verifier when PKCE is required", async () => {
    const codeChallenge = crypto
      .createHash("sha256")
      .update("some-verifier")
      .digest("base64url");

    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      codeChallenge,
      codeChallengeMethod: "S256",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
      // no code_verifier
    });

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
    expect(res.body.error_description).to.equal(
      "Missing code_verifier for PKCE",
    );
  });

  it("should include correct standard claims in the id_token", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      nonce: "test-nonce-abc",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server).post("/").send({
      client_id: "test-client",
      client_secret: "test-client-secret",
      redirect_uri: "https://app.example.com/callback",
      grant_type: "authorization_code",
      code,
    });

    expect(res.status).to.equal(200);

    const idToken = res.body.id_token;
    expect(idToken).to.be.a("string");

    // Decode the id_token (without verifying signature) to check claims
    const decoded = jose.decodeJwt(idToken);
    expect(decoded.iss).to.equal("https://provider.example.com");
    expect(decoded.aud).to.equal("test-client");
    expect(decoded.sub).to.be.a("string");
    expect(decoded.iat).to.be.a("number");
    expect(decoded.exp).to.be.a("number");
    expect((decoded.exp as number) - (decoded.iat as number)).to.equal(3600);
    expect(decoded.nonce).to.equal("test-nonce-abc");
  });

  it("should authenticate client via Basic Auth with valid credentials", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      redirectUri: "https://app.example.com/callback",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const authString = Buffer.from("test-client:test-client-secret").toString(
      "base64",
    );
    const res = await request(server)
      .post("/")
      .set("Authorization", `Basic ${authString}`)
      .send({
        redirect_uri: "https://app.example.com/callback",
        grant_type: "authorization_code",
        code,
      });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("access_token");
  });
});
