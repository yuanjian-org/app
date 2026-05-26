import { expect } from "chai";
import * as sinon from "sinon";
import { TokenSet } from "openid-client";
import YuantuSsoProvider from "./YuantuSsoProvider";

describe("YuantuSsoProvider", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should return the correct configuration", () => {
    const config = YuantuSsoProvider({
      clientId: "my-client-id",
      clientSecret: "my-client-secret",
      issuer: "https://sso.example.com",
    });

    expect(config.id).to.equal("yuantu-sso");
    expect(config.name).to.equal("YuanTu SSO");
    expect(config.type).to.equal("oauth");
    expect(config.client?.id_token_signed_response_alg).to.equal("HS256");
    expect(config.clientId).to.equal("my-client-id");
    // @ts-ignore
    expect(config.clientSecret).to.equal("my-client-secret");
    expect(config.issuer).to.equal("https://sso.example.com");
    expect(config.allowDangerousEmailAccountLinking).to.equal(true);

    expect(config.authorization?.url).to.equal(
      "https://sso.example.com/api/oauth2/authorize",
    );
    // @ts-ignore
    expect(config.authorization?.params?.scope).to.equal(
      "openid profile email phone",
    );

    expect(config.token?.url).to.equal(
      "https://sso.example.com/api/oauth2/token",
    );
    expect(config.userinfo?.url).to.equal(
      "https://sso.example.com/api/oauth2/userinfo",
    );

    expect(config.checks).to.deep.equal(["pkce", "state"]);
  });

  describe("userinfo.request", () => {
    it("should call client.userinfo with TokenSet", async () => {
      const config = YuantuSsoProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        issuer: "https://sso.example.com",
      });

      const mockProfile = {
        sub: "mock-sub",
        email: "mock@example.com",
        name: "Mock User",
        phone_number: "1234567890",
      };

      const userinfoStub = sinon.stub().resolves(mockProfile);
      const mockClient = {
        userinfo: userinfoStub,
      };

      const requestFn = config.userinfo?.request;
      expect(requestFn).to.not.equal(undefined);

      const tokens = { access_token: "mock-access-token" };

      // @ts-ignore
      const result = await requestFn!({
        client: mockClient as any,
        tokens,
        provider: config as any,
      });

      expect(result).to.deep.equal(mockProfile);
      expect(userinfoStub.callCount).to.equal(1);

      const arg = userinfoStub.firstCall.args[0];
      expect(arg).to.be.instanceOf(TokenSet);
      expect(arg.access_token).to.equal("mock-access-token");
    });

    it("should pass existing TokenSet directly", async () => {
      const config = YuantuSsoProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        issuer: "https://sso.example.com",
      });

      const userinfoStub = sinon.stub().resolves({});
      const mockClient = {
        userinfo: userinfoStub,
      };

      const requestFn = config.userinfo?.request;

      const tokens = new TokenSet({ access_token: "mock-token" });

      // @ts-ignore
      await requestFn!({
        client: mockClient as any,
        tokens,
        provider: config as any,
      });

      expect(userinfoStub.callCount).to.equal(1);
      const arg = userinfoStub.firstCall.args[0];
      expect(arg).to.equal(tokens);
    });
  });

  describe("profile", () => {
    it("should return the correctly mapped profile", () => {
      const config = YuantuSsoProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        issuer: "https://sso.example.com",
      });

      const mockProfile = {
        sub: "MockSubId",
        email: "mock@example.com",
        name: "Mock User",
        phone_number: "1234567890",
      };

      const profileFn = config.profile;
      expect(profileFn).to.not.equal(undefined);

      const result = profileFn!(mockProfile, { access_token: "mock" } as any);

      expect(result).to.deep.equal({
        id: "MockSubId",
        email: "+mock+sub+id@sso.fe",
        realEmail: "mock@example.com",
        name: "Mock User",
        phone: "1234567890",
      });
    });

    it("should handle missing optional fields", () => {
      const config = YuantuSsoProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        issuer: "https://sso.example.com",
      });

      const mockProfile = {
        sub: "MockSubId",
      };

      const profileFn = config.profile;
      const result = profileFn!(mockProfile, { access_token: "mock" } as any);

      expect(result).to.deep.equal({
        id: "MockSubId",
        email: "+mock+sub+id@sso.fe",
        realEmail: undefined,
        name: undefined,
        phone: undefined,
      });
    });
  });
});
