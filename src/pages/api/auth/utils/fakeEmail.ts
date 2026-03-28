import invariant from "../../../../shared/invariant";

export const wechatFakeEmailDomain = "@wechat.fe";

/**
 * next-auth very annoyingly lower case emails when passing it to
 * `adapter.getUserByEmail`, but UnionID is case sensitive. So we encode
 * cases using plus signs.
 */
export function unionId2Email(unionid: string): string {
  if (!unionid || unionid.includes("+")) {
    console.error(`unionid "${unionid}" is invalid`);
    throw new Error(`尚未支持的微信账号ID格式`);
  }
  return unionid.replace(/[A-Z]/g, "+$&").toLowerCase() + wechatFakeEmailDomain;
}

export function email2UnionId(email: string): string {
  invariant(
    email.endsWith(wechatFakeEmailDomain),
    `email "${email}" doesn't end with ${wechatFakeEmailDomain}`,
  );
  return email
    .slice(0, -wechatFakeEmailDomain.length)
    .replace(/\+(.)/g, (_, char) => char.toUpperCase());
}

export const ssoFakeEmailDomain = "@sso.fe";

export function ssoUserId2Email(ssoUserId: string): string {
  if (!ssoUserId || ssoUserId.includes("+")) {
    console.error(`ssoUserId "${ssoUserId}" is invalid`);
    throw new Error(`尚未支持的SSO账号ID格式`);
  }
  return ssoUserId.replace(/[A-Z]/g, "+$&").toLowerCase() + ssoFakeEmailDomain;
}

export function email2SsoUserId(email: string): string {
  invariant(
    email.endsWith(ssoFakeEmailDomain),
    `email "${email}" doesn't end with ${ssoFakeEmailDomain}`,
  );
  return email
    .slice(0, -ssoFakeEmailDomain.length)
    .replace(/\+(.)/g, (_, char) => char.toUpperCase());
}
