import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface WeChatProfile {
  openid: string
  nickname: string
  sex: number
  province: string
  city: string
  country: string
  headimgurl: string
  privilege: string[]
  unionid: string
  [claim: string]: unknown
}


export default function WeChat(
  options: OAuthUserConfig<WeChatProfile> & {
    platformType?: "OfficialAccount" | "WebsiteApp"
  }
): OAuthConfig<WeChatProfile> {
  const { clientId, clientSecret, platformType = "OfficialAccount" } = options;
  return {
    id: "wechat",
    name: "WeChat",
    type: "oauth",
    style: { logo: "/login/wechat.svg", bg: "#fff", text: "#000" },
    checks: ["state"],
    authorization: {
      url:
        platformType === "OfficialAccount"
          ? "https://open.weixin.qq.com/connect/oauth2/authorize"
          : "https://open.weixin.qq.com/connect/qrconnect",
      params: {
        appid: clientId,
        scope:
          platformType === "OfficialAccount"
            ? "snsapi_userinfo"
            : "snsapi_login",
      },
    },
    token: {
      async request({ params }) {
        if (!params.code) throw new Error("No code provided");
        const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
        url.searchParams.set("appid", clientId);
        url.searchParams.set("secret", clientSecret);
        url.searchParams.set("code", params.code);
        url.searchParams.set("grant_type", "authorization_code");
        const response = await fetch(url);
        const data = await response.json();
        return { tokens: data };
      }
    },

    userinfo: {
      async request({ tokens }) {
        const url = new URL("https://api.weixin.qq.com/sns/userinfo");
        url.searchParams.set("access_token", tokens.access_token!);
        url.searchParams.set("openid", String(tokens.openid));
        url.searchParams.set("lang", "zh_CN");
        const response = await fetch(url);
        return response.json();
      },
    },
    profile(profile) {
      return {
        id: profile.openid,
        name: profile.nickname,
        // TODO: There is no email for wechat, remove it!! It's for test only
        email: profile.openid + "@wechat.com",
        image: profile.headimgurl,
      };
    },
    options,
  };
}
