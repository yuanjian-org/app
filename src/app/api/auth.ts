import { NextRequest } from "next/server";
// import * as jwtStrategy from 'next-auth/jwt'
// import authBaseConfig from "../../server/authBaseConfig";
import invariant from "tiny-invariant";
function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}
/*
const sessionTokenName = authBaseConfig?.cookies?.sessionToken?.name;
const secret = process.env.NEXTAUTH_SECRET;
invariant(sessionTokenName !== undefined);
invariant(secret !== undefined);
const F_SESSION_TOKEN_NAME = Object.freeze({
  value: sessionTokenName,
});
const F_SECRET = Object.freeze({
  value: secret,
});


/!*
Ensure the same parsing strategy with next-auth
Copied from
https://github.com/nextauthjs/next-auth/blob/28e4328704776fcf1c88003b3eb6e5c28d15d49c/packages/core/src/lib/routes/session.ts#L37
 *!/
export const authDecode = async (token: string) => {
  const decodedToken = await jwtStrategy.decode({ secret: F_SECRET.value, token: token }); // might throw error in this line as well

  if (!decodedToken) {
    throw new Error("Invalid JWT");
  }
  return decodedToken;
}*/

export async function auth(req: NextRequest) {
  return {
    error: false as const,
    decodedToken: undefined
  };

  console.log("[url] ", req.method, req.url);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());

  const sessionToken = req.cookies.get(F_SESSION_TOKEN_NAME.value);

  console.log("[sessionToken] ", F_SESSION_TOKEN_NAME.value, sessionToken);

  try {
    const sessionTokenValue = sessionToken?.value;
    invariant(sessionTokenValue, 'sessionTokenValue');

    const decodedToken = await authDecode(sessionTokenValue);

    return {
      error: false as const,
      decodedToken,
    };
  } catch (e) {
    console.warn(e);
    return {
      error: true as const,
    };
  }
}
