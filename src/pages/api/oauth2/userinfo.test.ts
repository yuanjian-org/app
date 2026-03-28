import { expect } from "chai";
import request from "supertest";
import crypto from "crypto";
import sinon from "sinon";
import { createTestServer } from "./testUtils";
import userinfoHandler from "./userinfo";
import { encryptPayload, hashUserIdForClient } from "./utils";
import db from "../../../api/database/db";

describe("OAuth2 userinfoHandler", () => {
  let server: ReturnType<typeof createTestServer>;
  let originalEnv: NodeJS.ProcessEnv;
  let findByPkStub: sinon.SinonStub;

  before(() => {
    originalEnv = { ...process.env };
    server = createTestServer(userinfoHandler);
  });

  after(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    process.env.OAUTH2_CLIENT_ID = "test-client";
    process.env.NEXTAUTH_SECRET = "test-secret-1234567890";

    findByPkStub = sinon.stub(db.User, "findByPk");
  });

  afterEach(() => {
    findByPkStub.restore();
  });

  it("should return 405 for methods other than GET or POST", async () => {
    const res = await request(server).put("/");
    expect(res.status).to.equal(405);
  });

  it("should return 401 if missing Authorization header", async () => {
    const res = await request(server).get("/");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should return 401 if Authorization header is invalid", async () => {
    const res = await request(server)
      .get("/")
      .set("Authorization", "Basic xyz");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should return 401 for an invalid access token", async () => {
    const res = await request(server)
      .get("/")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_token");
  });

  it("should return 401 for JWT Type Confusion (using authorization code as access token)", async () => {
    const codePayload = {
      type: "code",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const code = await encryptPayload(codePayload);

    const res = await request(server)
      .get("/")
      .set("Authorization", `Bearer ${code}`);
    expect(res.status).to.equal(401);
    expect(res.body.error_description).to.include("Invalid token type");
  });

  it("should return 401 if access token is for wrong client", async () => {
    const accessTokenPayload = {
      type: "access",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "wrong-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const token = await encryptPayload(accessTokenPayload);

    const res = await request(server)
      .get("/")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(401);
    expect(res.body.error_description).to.equal("Invalid client_id");
  });

  it("should return 404 if user is not found in database", async () => {
    findByPkStub.resolves(null);

    const accessTokenPayload = {
      type: "access",
      jti: crypto.randomUUID(),
      userId: "user-123",
      clientId: "test-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const token = await encryptPayload(accessTokenPayload);

    const res = await request(server)
      .get("/")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal("user_not_found");
  });

  it("should return correct userinfo for valid access token", async () => {
    const mockUser = {
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
    };
    findByPkStub.resolves(mockUser);

    const accessTokenPayload = {
      type: "access",
      jti: crypto.randomUUID(),
      userId: mockUser.id,
      clientId: "test-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    };
    const token = await encryptPayload(accessTokenPayload);

    const res = await request(server)
      .get("/")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);

    // Assert sub claim is properly hashed
    const expectedSub = hashUserIdForClient("test-client", mockUser.id);
    expect(res.body.sub).to.equal(expectedSub);
    expect(res.body.name).to.equal(mockUser.name);
    expect(res.body.email).to.equal(mockUser.email);
    expect(res.body.phone_number).to.equal(mockUser.phone);
  });
});
