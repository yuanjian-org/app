/**
 * See docs/WeChat.md for details.
 */
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

/**
 * See docs/WeChat.md for unionid vs openid
 */
export interface WeChatProfile {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid: string;
  [claim: string]: unknown;
}

export default function WeChatProvider(
  options: OAuthUserConfig<WeChatProfile> & {
    platformType: "OfficialAccount" | "WebsiteApp";
  },
): OAuthConfig<WeChatProfile> {
  const { clientId, clientSecret, platformType } = options;

  return {
    id: "wechat",
    name: "WeChat",
    type: "oauth",
    // style: { logo: "/img/wechat.svg", bg: "#fff", text: "#000" },
    checks: ["state"],

    // We need this option to allow next-auth to link 微信开放平台 & 微信公众平台
    // accounts that share the same UnionID. See docs/WeChat.md.
    allowDangerousEmailAccountLinking: true,

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
        try {
          if (!params.code) throw new Error("No code provided");
          const url = new URL(
            "https://api.weixin.qq.com/sns/oauth2/access_token",
          );
          url.searchParams.set("appid", clientId);
          url.searchParams.set("secret", clientSecret);
          url.searchParams.set("code", params.code);
          url.searchParams.set("grant_type", "authorization_code");
          const response = await fetch(url);
          const data = await response.json();
          return { tokens: data };
        } catch (error) {
          console.error("WeChat token request failed:", error);
          throw new Error("微信登录失败,请重试");
        }
      },
    },

    userinfo: {
      async request({ tokens }) {
        if (!tokens.access_token) {
          throw new Error("未获取到微信授权");
        }
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
        // next-auth saves it to the `provider_account_id` column of the
        // `accounts` table.
        id: profile.unionid,

        // Used to create a user if the user doesn't exist. See
        // sequelize-adapter's createUser method.
        wechatUnionId: profile.unionid,
      };
    },

    options,
  };
}
