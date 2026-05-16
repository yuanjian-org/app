import { expect } from "chai";
import * as sinon from "sinon";
import WeChatProvider from "./WeChatProvider";

describe("WeChatProvider", () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, "fetch");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return the correct configuration for OfficialAccount", () => {
    const config = WeChatProvider({
      clientId: "my-client-id",
      clientSecret: "my-client-secret",
      platformType: "OfficialAccount",
    });

    expect(config.id).to.equal("wechat");
    expect(config.authorization?.url).to.equal(
      "https://open.weixin.qq.com/connect/oauth2/authorize"
    );
    // @ts-ignore
    expect(config.authorization?.params?.scope).to.equal("snsapi_userinfo");
  });

  it("should return the correct configuration for WebsiteApp", () => {
    const config = WeChatProvider({
      clientId: "my-client-id",
      clientSecret: "my-client-secret",
      platformType: "WebsiteApp",
    });

    expect(config.id).to.equal("wechat");
    expect(config.authorization?.url).to.equal(
      "https://open.weixin.qq.com/connect/qrconnect"
    );
    // @ts-ignore
    expect(config.authorization?.params?.scope).to.equal("snsapi_login");
  });

  describe("token.request", () => {
    it("should fetch the access token successfully", async () => {
      const config = WeChatProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        platformType: "OfficialAccount",
      });

      const mockResponse = {
        access_token: "mock-access-token",
        openid: "mock-openid",
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockResponse),
      } as unknown as Response);

      const request = config.token?.request;
      expect(request).to.not.equal(undefined);

      // @ts-ignore
      const result = await request!({
        params: { code: "mock-code" },
        checks: {},
        provider: config as any,
        client: {} as any,
      });

      expect(result).to.deep.equal({ tokens: mockResponse });
      expect(fetchStub.callCount).to.equal(1);
      const url = new URL(fetchStub.firstCall.args[0] as string);
      expect(url.origin + url.pathname).to.equal(
        "https://api.weixin.qq.com/sns/oauth2/access_token"
      );
      expect(url.searchParams.get("appid")).to.equal("my-client-id");
      expect(url.searchParams.get("secret")).to.equal("my-client-secret");
      expect(url.searchParams.get("code")).to.equal("mock-code");
      expect(url.searchParams.get("grant_type")).to.equal("authorization_code");
    });

    it("should throw an error if no code is provided", async () => {
      const config = WeChatProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        platformType: "OfficialAccount",
      });

      const request = config.token?.request;

      try {
        sinon.stub(console, "error");
        // @ts-ignore
        await request!({
          params: {},
          checks: {},
          provider: config as any,
          client: {} as any,
        });
        expect.fail("Should have thrown an error");
      } catch (e: any) {
        expect(e.message).to.equal("微信登录失败,请重试");
      }
    });
  });

  describe("userinfo.request", () => {
    it("should fetch user info successfully", async () => {
      const config = WeChatProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        platformType: "OfficialAccount",
      });

      const mockProfile = {
        openid: "mock-openid",
        nickname: "mock-nickname",
        unionid: "mock-unionid",
      };

      fetchStub.resolves({
        json: sinon.stub().resolves(mockProfile),
      } as unknown as Response);

      const request = config.userinfo?.request;
      expect(request).to.not.equal(undefined);

      // @ts-ignore
      const result = await request!({
        tokens: { access_token: "mock-access-token", openid: "mock-openid" },
        provider: config as any,
        client: {} as any,
      });

      expect(result).to.deep.equal(mockProfile);
      expect(fetchStub.callCount).to.equal(1);
      const url = new URL(fetchStub.firstCall.args[0] as string);
      expect(url.origin + url.pathname).to.equal(
        "https://api.weixin.qq.com/sns/userinfo"
      );
      expect(url.searchParams.get("access_token")).to.equal("mock-access-token");
      expect(url.searchParams.get("openid")).to.equal("mock-openid");
      expect(url.searchParams.get("lang")).to.equal("zh_CN");
    });

    it("should throw an error if access_token is missing", async () => {
      const config = WeChatProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        platformType: "OfficialAccount",
      });

      const request = config.userinfo?.request;

      try {
        // @ts-ignore
        await request!({
          tokens: { openid: "mock-openid" },
          provider: config as any,
          client: {} as any,
        });
        expect.fail("Should have thrown an error");
      } catch (e: any) {
        expect(e.message).to.equal("未获取到微信授权");
      }
    });
  });

  describe("profile", () => {
    it("should return the correctly mapped profile", () => {
      const config = WeChatProvider({
        clientId: "my-client-id",
        clientSecret: "my-client-secret",
        platformType: "OfficialAccount",
      });

      const mockProfile = {
        openid: "mock-openid",
        nickname: "mock-nickname",
        sex: 1,
        province: "mock-province",
        city: "mock-city",
        country: "mock-country",
        headimgurl: "mock-headimgurl",
        privilege: [],
        unionid: "MockUnionId",
      };

      const profileFn = config.profile;
      expect(profileFn).to.not.equal(undefined);

      const result = profileFn!(mockProfile, { access_token: "mock" } as any);

      expect(result).to.deep.equal({
        id: "MockUnionId",
        email: "+mock+union+id@wechat.fe",
      });
    });
  });
});
