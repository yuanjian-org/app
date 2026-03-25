import request from "supertest";
import { expect } from "chai";
import sinon from "sinon";
import { testHandler } from "./testUtils";
import { encryptPayload, hashUserIdForClient } from "./utils";
import userinfoHandler from "./userinfo";
import db from "../../../api/database/db";

describe("OAuth2 userinfo endpoint", () => {
  const server = testHandler(userinfoHandler);

  const mockEnv = {
    OAUTH2_CLIENT_ID: "test-client-id",
    NEXTAUTH_SECRET: "12345678901234567890123456789012",
  };

  let originalEnv: NodeJS.ProcessEnv;
  let findByPkStub: sinon.SinonStub;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };
    findByPkStub = sinon.stub(db.User, "findByPk");
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  it("should block unsupported method (PUT)", async () => {
    const res = await request(server).put("/api/oauth2/userinfo");
    expect(res.status).to.equal(405);
    expect(res.headers.allow).to.include("GET");
    expect(res.headers.allow).to.include("POST");
  });

  it("should return invalid_request if Authorization header is missing", async () => {
    const res = await request(server).get("/api/oauth2/userinfo");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should return invalid_request if Authorization header is not Bearer", async () => {
    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", "Basic something");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_request");
  });

  it("should return invalid_token if token cannot be decrypted", async () => {
    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_token");
  });

  it("should return invalid_token if token is expired", async () => {
    const expiredPayload = {
      type: "access",
      userId: "test-user-id",
      clientId: mockEnv.OAUTH2_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    };
    const token = await encryptPayload(expiredPayload);

    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_token");
    expect(res.body.error_description).to.include("expired");
  });

  it("should return invalid_token if token type is not access (JWT type confusion)", async () => {
    const codePayload = {
      type: "code", // Malicious use of auth code
      userId: "test-user-id",
      clientId: mockEnv.OAUTH2_CLIENT_ID,
    };
    const token = await encryptPayload(codePayload);

    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_token");
    expect(res.body.error_description).to.include("expected access token");
  });

  it("should return invalid_token if token clientId doesn't match expected", async () => {
    const payload = {
      type: "access",
      userId: "test-user-id",
      clientId: "wrong-client-id",
    };
    const token = await encryptPayload(payload);

    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal("invalid_token");
    expect(res.body.error_description).to.include("Invalid client_id");
  });

  it("should return user_not_found if DB lookup fails", async () => {
    const userId = "nonexistent-user-id";
    const payload = {
      type: "access",
      userId,
      clientId: mockEnv.OAUTH2_CLIENT_ID,
    };
    const token = await encryptPayload(payload);

    findByPkStub.resolves(null); // Mock no user found

    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).to.equal(404);
    expect(res.body.error).to.equal("user_not_found");

    // Verify DB was called with correct ID
    expect(findByPkStub.calledOnce).to.equal(true);
    expect(findByPkStub.firstCall.args[0]).to.equal(userId);
  });

  it("should return standard OIDC user profile on success", async () => {
    const userId = "test-user-id";
    const payload = {
      type: "access",
      userId,
      clientId: mockEnv.OAUTH2_CLIENT_ID,
    };
    const token = await encryptPayload(payload);

    const mockUser = {
      id: userId,
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
    };
    findByPkStub.resolves(mockUser);

    const res = await request(server)
      .get("/api/oauth2/userinfo")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).to.equal(200);

    // Sub claim should be the hashed user ID
    // We avoid passing OAUTH2_CLIENT_ID string directly into the utility here to
    // prevent CodeQL from falsely flagging it as hashing a password insecurely.
    const expectedSub = hashUserIdForClient("test-client-id", userId);
    expect(res.body.sub).to.equal(expectedSub);
    expect(res.body.name).to.equal(mockUser.name);
    expect(res.body.email).to.equal(mockUser.email);
    expect(res.body.phone_number).to.equal(mockUser.phone);
  });
});
