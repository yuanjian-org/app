/**
 * See docs/WeChat.md for details.
 */
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import invariant from "../../../shared/invariant";

/**
 * See docs/WeChat.md for unionid vs openid
 */
interface WeChatProfile {
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

export const fakeEmailDomain = "@f.ml";

/**
 * next-auth very annoyingly lower case emails when passing it to
 * `wechatAdapter.getUserByEmail`, but UnionID is case sensitive. So we encode
 * cases using plus signs.
 */
export function unionId2Email(unionid: string): string {
  if (!unionid || unionid.includes("+")) {
    console.error(`unionid "${unionid}" is invalid`);
    throw new Error(`尚未支持的微信账号ID格式`);
  }
  return unionid.replace(/[A-Z]/g, "+$&") + fakeEmailDomain;
}

export function email2UnionId(email: string): string {
  invariant(
    email.endsWith(fakeEmailDomain),
    `email "${email}" doesn't end with ${fakeEmailDomain}`,
  );
  return email
    .slice(0, -fakeEmailDomain.length)
    .replace(/\+(.)/g, (_, char) => char.toUpperCase());
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
        // `wechatAdapter.createUser`.
        wechatUnionId: profile.unionid,

        // next-auth rely on email to search for existing users. We don't store
        // the email in the database. See `wechatAdapter.getUserByEmail`.
        email: unionId2Email(profile.unionid),
      };
    },

    options,
  };
}
