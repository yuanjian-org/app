import { expect } from "chai";
import request from "supertest";
import proxyquire from "proxyquire";
import { createTestServer } from "../../../api/oauth2/testUtils";

describe("OAuth2 authorizeHandler", () => {
  let server: ReturnType<typeof createTestServer>;
  let mockSession: any = null;
  let originalEnv: NodeJS.ProcessEnv;

  before(function () {
    this.timeout(10000); // Sometimes proxyquire takes a bit to load in Next.js tests
    originalEnv = { ...process.env };
    // Provide a dummy DATABASE_URI so that modules that accidentally trigger DB initialization won't throw
    if (!process.env.DATABASE_URI) {
      process.env.DATABASE_URI =
        "postgres://postgres:postgres@localhost:5432/yuanjian";
    }

    // Use proxyquire to mock next-auth
    const authorizeHandler = proxyquire("./authorize", {
      "next-auth": {
        getServerSession: () => Promise.resolve(mockSession),
      },
    }).default;

    server = createTestServer(authorizeHandler);
  });

  after(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockSession = null;
    process.env.OAUTH2_CLIENT_ID = "test-client";
    process.env.OAUTH2_REDIRECT_URI = "https://app.example.com/callback";
    process.env.NEXTAUTH_SECRET = "test-secret-1234567890";
  });

  it("should return 405 for methods other than GET or POST", async () => {
    const res = await request(server).put("/?client_id=123");
    expect(res.status).to.equal(405);
  });

  it("should return 500 if provider is not configured", async () => {
    delete process.env.OAUTH2_CLIENT_ID;
    const res = await request(server).get("/");
    expect(res.status).to.equal(500);
    expect(res.body.error).to.equal("OAuth2 Provider not configured.");
  });

  it("should return 400 for invalid client_id", async () => {
    const res = await request(server).get("/?client_id=wrong");
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_client");
  });

  it("should return 400 for invalid response_type", async () => {
    const res = await request(server).get(
      `/?client_id=test-client&response_type=token`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("unsupported_response_type");
  });

  it("should return 400 for mismatching redirect_uri", async () => {
    const res = await request(server).get(
      `/?client_id=test-client&response_type=code&redirect_uri=https://evil.com`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should return 400 for invalid code_challenge_method", async () => {
    const res = await request(server).get(
      `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&code_challenge=xyz&code_challenge_method=plain`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should redirect to login if user is not logged in", async () => {
    const currentUrl = `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback`;
    const res = await request(server).get(currentUrl);

    expect(res.status).to.equal(302);
    expect(res.header.location).to.include("/auth/login");
    expect(res.header.location).to.include("callbackUrl=");
  });

  it("should enforce phone number requirement with 403 if skip_profile=1 is present but phone is not set", async () => {
    mockSession = { me: { id: "user-123", phone: null } };
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

    const res = await request(server).get(
      `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&skip_profile=1`,
    );

    expect(res.status).to.equal(403);
    expect(res.body.error).to.equal("access_denied");
  });

  it("should explicitly redirect to set-profile if user is logged in (regardless of phone setting)", async () => {
    mockSession = { me: { id: "user-123", phone: null } };
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

    const currentUrl = `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&state=state123`;
    const res = await request(server).get(currentUrl);

    expect(res.status).to.equal(302);
    expect(res.header.location).to.include("/auth/set-profile");
    expect(res.header.location).to.include("callbackUrl=");
    expect(res.header.location).to.include("skip_profile%3D1"); // encoded
  });

  it("should redirect back with code if user is logged in and skip_profile=1 is present", async () => {
    mockSession = { me: { id: "user-123", phone: "1234567890" } };
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

    const res = await request(server).get(
      `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&state=state123&skip_profile=1`,
    );

    expect(res.status).to.equal(302);

    if (res.header.location?.includes("/auth/login")) {
      expect.fail(
        `Redirected to login instead of callback. Session mock failed. Location: ${res.header.location}`,
      );
    }

    expect(res.header.location).to.match(
      /^https:\/\/app\.example\.com\/callback\?code=[A-Za-z0-9\-_\.]+&state=state123$/,
    );
  });

  it("should accept POST method and redirect back with code if skip_profile=1 is present", async () => {
    mockSession = { me: { id: "user-456", phone: "1234567890" } };
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

    const res = await request(server).post(
      `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&skip_profile=1`,
    );

    expect(res.status).to.equal(302);
    if (res.header.location?.includes("/auth/login")) {
      expect.fail(
        `Redirected to login instead of callback. Session mock failed.`,
      );
    }
    expect(res.header.location).to.match(
      /^https:\/\/app\.example\.com\/callback\?code=[A-Za-z0-9\-_\.]+$/,
    );
  });

  it("should redirect back with code when PKCE S256 challenge is provided and skip_profile=1 is present", async () => {
    mockSession = { me: { id: "user-123", phone: "1234567890" } };
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

    const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

    const res = await request(server).get(
      `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&code_challenge=${codeChallenge}&code_challenge_method=S256&skip_profile=1`,
    );

    expect(res.status).to.equal(302);
    expect(res.header.location).to.match(
      /^https:\/\/app\.example\.com\/callback\?code=[A-Za-z0-9\-_\.]+$/,
    );
  });

  it("should return 400 for code_challenge without code_challenge_method", async () => {
    const res = await request(server).get(
      `/?client_id=test-client&response_type=code&redirect_uri=https://app.example.com/callback&code_challenge=somechallenge`,
    );
    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal("invalid_request");
  });
});
