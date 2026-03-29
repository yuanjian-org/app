import { Transaction } from "sequelize";
import db from "../database/db";
import { displayName } from "../../shared/Role";
import { generalBadRequestError } from "../errors";
import { formatUserName, isValidEmail, toPinyin } from "../../shared/strings";

function isValidUserUrl(url: string) {
  return /^[a-z0-9]+$/.test(url);
}

/**
 * @param email Set to undefined to omit it in the output.
 * @param name Set to undefined to omit it in the output.
 * @param url Set to null or undefined to auto generate the url or inherit the
 * old url if `oldUrl` is not null.
 */
export async function checkAndComputeUserFields({
  email,
  name,
  isVolunteer,
  url,
  oldUrl,
  transaction,
}: {
  email?: string | null;
  name?: string | null;
  isVolunteer: boolean;
  url?: string | null;
  oldUrl: string | null;
  transaction: Transaction;
}): Promise<{
  email?: string | null;
  name?: string | null;
  pinyin?: string | null;
  url?: string | null;
}> {
  /**
   * We don't check Chinese name validity here, because the user
   * may be automatically created via WeChat sign-in or application form
   * submission. We simply can't enforce Chinese names in these cases without
   * breaking the workflow.
   */
  if (email && !isValidEmail(email)) {
    throw generalBadRequestError("Email地址无效。");
  }

  return {
    ...(name !== undefined && {
      name,
      pinyin: name === null ? null : toPinyin(name),
    }),
    ...(email !== undefined && { email: email?.toLowerCase() ?? null }),
    ...(await checkAndComputeUrl(name, isVolunteer, oldUrl, url, transaction)),
  };
}

async function checkAndComputeUrl(
  name: string | null | undefined,
  isVolunteer: boolean,
  oldUrl: string | null,
  url: string | null | undefined,
  transaction: Transaction,
): Promise<{
  url?: string | null;
}> {
  if (url !== undefined && url !== null) {
    if (!isValidUserUrl(url)) {
      throw generalBadRequestError(
        "用户URL格式无效。只允许小写英文字母和数字。",
      );
    }

    if (url === oldUrl) {
      // Nothing is changing
      return {};
    } else if (!isVolunteer) {
      // Only volunteers are allowed to set urls
      throw generalBadRequestError(
        `非${displayName("Volunteer")}` + "没有设置URL的权限。",
      );
    } else {
      if (await db.User.count({ where: { url }, transaction })) {
        throw generalBadRequestError("此用户URL已被注册。");
      }
      return { url };
    }
  } else if (oldUrl !== null) {
    // Retain the old url if it's already set
    return {};
  } else if (!isVolunteer) {
    // Only populate urls for volunteers
    return {};
  } else {
    // Auto generate an url
    const base = name
      ? toPinyin(formatUserName(name, "friendly"))
      : "anonymous";

    let suffix = 1;
    const getNextUrl = () => {
      const ret = base + (suffix === 1 ? "" : `${suffix}`);
      suffix++;
      return ret;
    };

    while (true) {
      const nextUrl = getNextUrl();
      if (
        (await db.User.count({ where: { url: nextUrl }, transaction })) === 0
      ) {
        return { url: nextUrl };
      }
    }
  }
}
