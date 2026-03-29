import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";
import { TokenSet } from "openid-client";
import { ssoUserId2Email } from "./fakeEmail";

export default function YuantuSsoProvider(
  options: OAuthUserConfig<any> & { issuer: string },
): OAuthConfig<any> {
  const { clientId, clientSecret, issuer } = options;

  return {
    id: "yuantu-sso",
    name: "YuanTu SSO",
    type: "oauth",
    // Our in-house OAuth2 provider signs id_token with HS256 (shared client
    // secret),
    // so we must override openid-client's RS256 default expectation.
    client: { id_token_signed_response_alg: "HS256" },
    clientId,
    clientSecret,
    issuer,
    // We need this option to allow next-auth to link  accounts that share the
    // same user id on the sso server.
    allowDangerousEmailAccountLinking: true,
    authorization: {
      url: `${issuer}/api/oauth2/authorize`,
      params: { scope: "openid profile email phone" },
    },
    token: { url: `${issuer}/api/oauth2/token` },
    userinfo: {
      url: `${issuer}/api/oauth2/userinfo`,
      // NextAuth otherwise uses only id_token claims for the profile when
      // `idToken` is enabled. Our id_token carries `sub` only; additional
      // fields such as name and phone number come from the OIDC userinfo
      // response (see `oauth2/userinfo.ts`).
      request({ client, tokens }) {
        return client.userinfo(
          tokens instanceof TokenSet ? tokens : new TokenSet(tokens),
        );
      },
    },
    checks: ["pkce", "state"],
    profile(profile) {
      // For more information on why we encode the ssoUserId into the email,
      // see WeChatProvider.profile() function.
      return {
        id: profile.sub,
        ssoUserId: profile.sub,
        email: ssoUserId2Email(profile.sub),
        name: profile.name ?? undefined,
        phone: profile.phone_number ?? undefined,
      };
    },
    options,
  };
}
