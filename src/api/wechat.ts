/**
 * Low-level API for sending WeChat Service Account (服务号) template
 * notifications. Use higher-level API notify*() when possible.
 * See docs/WeChat.md for setup instructions.
 */
import axios from "axios";
import { LRUCache } from "lru-cache";
import moment from "moment-timezone";
import pLimit from "p-limit";
import { Op, Transaction } from "sequelize";
import z from "zod";
import db from "./database/db";
import sequelize from "./database/sequelize";

export type WeChatMessage = {
  title: string;
  content: string;
  // Relative path (e.g. "/shudong") or full URL opened when tapping the card.
  url?: string;
};

export type WeChatRecipient = {
  id: string;
  wechatUnionId: string | null;
  wechatOpenId: string | null;
};

const WECHAT_API_BASE = "https://api.weixin.qq.com/cgi-bin";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const FOLLOWER_SYNC_COOLDOWN_MS = 60 * 1000;
const BATCH_GET_LIMIT = 100;
const SEND_CONCURRENCY = 5;

const TOKEN_EXPIRED_CODES = new Set([40001, 40014]);
// 40003: invalid openid, 43004: require subscribe, 43101: user refused msg
const USER_SKIPPABLE_CODES = new Set([40003, 43004, 43101]);

let tokenCache: {
  appId: string;
  token: string;
  expiresAt: number;
} | null = null;

let lastFollowerSyncAt = 0;
let lastSyncedUnionIdToOpenId = new Map<string, string>();

// Maps Service Account openid -> Open Platform unionid so public followers are
// not re-queried via user/info/batchget on subsequent syncs.
const openIdToUnionIdCache = new LRUCache<string, string>({
  max: 50000,
});

/**
 * Reset module-level caches. Primarily used in unit tests.
 */
export function clearWeChatCaches() {
  tokenCache = null;
  lastFollowerSyncAt = 0;
  lastSyncedUnionIdToOpenId = new Map();
  openIdToUnionIdCache.clear();
}

export function isWeChatNotificationConfigured(): boolean {
  return Boolean(
    process.env.AUTH_WECHAT_APP_ID &&
    process.env.AUTH_WECHAT_APP_SECRET &&
    process.env.WECHAT_NOTIFICATION_TEMPLATE_ID,
  );
}

/**
 * Sanitize and truncate text for WeChat `thing` template fields, which reject
 * newlines, emojis, and strings longer than 20 characters (errcode 47003).
 */
export function sanitizeWeChatThing(
  raw: string,
  fallback: string = "点击查看详情",
): string {
  const cleaned = raw
    .replace(/<br\s*\/?>|<\/li>|<\/p>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#~>]/g, "")
    .replace(
      /\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  const chars = Array.from(cleaned);
  if (chars.length === 0) return fallback;
  if (chars.length <= 20) return cleaned;
  return `${chars.slice(0, 19).join("")}…`;
}

/**
 * Build the `data` payload for `message/template/send`. Field keys default to
 * `thing1`, `thing2`, `time3` and can be customized or omitted (set to "") via
 * `WECHAT_NOTIFICATION_*_FIELD` environment variables.
 */
export function buildWeChatTemplateData(
  title: string,
  content: string,
  now: Date = new Date(),
): Record<string, { value: string }> {
  const titleField = process.env.WECHAT_NOTIFICATION_TITLE_FIELD ?? "thing1";
  const contentField =
    process.env.WECHAT_NOTIFICATION_CONTENT_FIELD ?? "thing2";
  const timeField = process.env.WECHAT_NOTIFICATION_TIME_FIELD ?? "time3";

  const data: Record<string, { value: string }> = {};
  if (titleField) {
    data[titleField] = { value: sanitizeWeChatThing(title, "系统通知") };
  }
  if (contentField) {
    data[contentField] = {
      value: sanitizeWeChatThing(content, "请点击查看详情"),
    };
  }
  if (timeField) {
    data[timeField] = {
      value: moment(now).tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm"),
    };
  }
  return data;
}

/**
 * Persist a user's Service Account OpenID matched by UnionID. Clears colliding
 * rows first so the unique constraint on `wechatOpenId` is preserved.
 */
export async function saveWeChatOpenIdForUnionId(
  unionId: string,
  openId: string,
  passedTransaction?: Transaction,
) {
  const doSave = async (transaction: Transaction) => {
    const user = await db.User.findOne({
      where: { wechatUnionId: unionId, mergedTo: null },
      attributes: ["id", "wechatOpenId"],
      transaction,
    });
    if (!user || user.wechatOpenId === openId) return;

    await db.User.update(
      { wechatOpenId: null },
      {
        where: { wechatOpenId: openId, id: { [Op.ne]: user.id } },
        transaction,
      },
    );
    await user.update({ wechatOpenId: openId }, { transaction });
  };

  if (passedTransaction) {
    await doSave(passedTransaction);
  } else {
    await sequelize.transaction(doSave);
  }
}

const zStableTokenResponse = z.object({
  access_token: z.string().optional(),
  expires_in: z.number().optional(),
  errcode: z.number().optional(),
  errmsg: z.string().optional(),
});

/**
 * Obtain a WeChat Service Account access token via `stable_token`, which is
 * safe across multiple server instances sharing the same AppID/AppSecret.
 */
export async function getWeChatAccessToken(
  forceRefresh: boolean = false,
): Promise<string> {
  const appId = process.env.AUTH_WECHAT_APP_ID;
  const secret = process.env.AUTH_WECHAT_APP_SECRET;
  if (!appId || !secret) {
    throw new Error("AUTH_WECHAT_APP_ID or AUTH_WECHAT_APP_SECRET is not set.");
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    tokenCache &&
    tokenCache.appId === appId &&
    tokenCache.expiresAt > now
  ) {
    return tokenCache.token;
  }

  const response = await axios.post(`${WECHAT_API_BASE}/stable_token`, {
    grant_type: "client_credential",
    appid: appId,
    secret,
    force_refresh: forceRefresh,
  });

  const parsed = zStableTokenResponse.parse(response.data);
  if (!parsed.access_token || (parsed.errcode && parsed.errcode !== 0)) {
    throw new Error(
      `Failed to get WeChat access_token: ` +
        `${parsed.errcode ?? "unknown"} ${parsed.errmsg ?? ""}`.trim(),
    );
  }

  const ttlMs = Math.max(
    (parsed.expires_in ?? 7200) * 1000 - TOKEN_REFRESH_BUFFER_MS,
    60 * 1000,
  );
  tokenCache = {
    appId,
    token: parsed.access_token,
    expiresAt: now + ttlMs,
  };
  return parsed.access_token;
}

const zUserGetResponse = z.object({
  total: z.number().optional(),
  count: z.number().optional(),
  data: z
    .object({
      openid: z.array(z.string()).optional(),
    })
    .optional(),
  next_openid: z.string().optional(),
  errcode: z.number().optional(),
  errmsg: z.string().optional(),
});

const zBatchGetResponse = z.object({
  user_info_list: z
    .array(
      z.object({
        subscribe: z.number(),
        openid: z.string(),
        unionid: z.string().optional(),
      }),
    )
    .optional(),
  errcode: z.number().optional(),
  errmsg: z.string().optional(),
});

async function fetchAllFollowerOpenIds(): Promise<string[]> {
  const openIds: string[] = [];
  let nextOpenId = "";
  const seenNextOpenIds = new Set<string>();

  while (true) {
    let token = await getWeChatAccessToken();
    let response = await axios.get(`${WECHAT_API_BASE}/user/get`, {
      params: {
        access_token: token,
        ...(nextOpenId && { next_openid: nextOpenId }),
      },
    });
    let parsed = zUserGetResponse.parse(response.data);

    if (parsed.errcode && TOKEN_EXPIRED_CODES.has(parsed.errcode)) {
      token = await getWeChatAccessToken(true);
      response = await axios.get(`${WECHAT_API_BASE}/user/get`, {
        params: {
          access_token: token,
          ...(nextOpenId && { next_openid: nextOpenId }),
        },
      });
      parsed = zUserGetResponse.parse(response.data);
    }

    if (parsed.errcode && parsed.errcode !== 0) {
      throw new Error(
        `WeChat user/get failed: ${parsed.errcode} ${parsed.errmsg ?? ""}`,
      );
    }

    const page = parsed.data?.openid ?? [];
    openIds.push(...page);

    if (
      !parsed.next_openid ||
      page.length === 0 ||
      seenNextOpenIds.has(parsed.next_openid)
    ) {
      break;
    }
    seenNextOpenIds.add(parsed.next_openid);
    nextOpenId = parsed.next_openid;
  }

  return openIds;
}

/**
 * Resolve Service Account `openid`s for users who have `wechatUnionId` and
 * have followed the Official Account, persisting `wechatOpenId` on `users`.
 */
export async function syncWeChatFollowerOpenIds(
  transaction?: Transaction,
): Promise<Map<string, string>> {
  const now = Date.now();
  if (now - lastFollowerSyncAt < FOLLOWER_SYNC_COOLDOWN_MS) {
    return lastSyncedUnionIdToOpenId;
  }
  lastFollowerSyncAt = now;

  // Seed cache from users whose OpenID and UnionID are already linked in DB.
  const knownUsers = await db.User.findAll({
    where: {
      wechatOpenId: { [Op.ne]: null },
      wechatUnionId: { [Op.ne]: null },
    },
    attributes: ["wechatOpenId", "wechatUnionId"],
    transaction,
  });
  for (const u of knownUsers) {
    if (u.wechatOpenId && u.wechatUnionId) {
      openIdToUnionIdCache.set(u.wechatOpenId, u.wechatUnionId);
    }
  }

  const followerOpenIds = await fetchAllFollowerOpenIds();
  const unknownOpenIds = followerOpenIds.filter(
    (id) => !openIdToUnionIdCache.has(id),
  );

  for (let i = 0; i < unknownOpenIds.length; i += BATCH_GET_LIMIT) {
    const chunk = unknownOpenIds.slice(i, i + BATCH_GET_LIMIT);
    const body = {
      user_list: chunk.map((openid) => ({ openid, lang: "zh_CN" })),
    };

    let token = await getWeChatAccessToken();
    let response = await axios.post(
      `${WECHAT_API_BASE}/user/info/batchget`,
      body,
      { params: { access_token: token } },
    );
    let parsed = zBatchGetResponse.parse(response.data);

    if (parsed.errcode && TOKEN_EXPIRED_CODES.has(parsed.errcode)) {
      token = await getWeChatAccessToken(true);
      response = await axios.post(
        `${WECHAT_API_BASE}/user/info/batchget`,
        body,
        { params: { access_token: token } },
      );
      parsed = zBatchGetResponse.parse(response.data);
    }

    if (parsed.errcode && parsed.errcode !== 0) {
      throw new Error(
        `WeChat batchget failed: ${parsed.errcode} ${parsed.errmsg ?? ""}`,
      );
    }

    for (const info of parsed.user_info_list ?? []) {
      if (info.subscribe !== 0 && info.unionid) {
        openIdToUnionIdCache.set(info.openid, info.unionid);
      }
    }
  }

  const unionIdToOpenId = new Map<string, string>();
  for (const openId of followerOpenIds) {
    const unionId = openIdToUnionIdCache.get(openId);
    if (unionId) {
      unionIdToOpenId.set(unionId, openId);
    }
  }

  if (unionIdToOpenId.size > 0) {
    const matchedUsers = await db.User.findAll({
      where: {
        wechatUnionId: { [Op.in]: Array.from(unionIdToOpenId.keys()) },
        mergedTo: null,
      },
      attributes: ["id", "wechatUnionId", "wechatOpenId"],
      transaction,
    });

    for (const u of matchedUsers) {
      const openId = u.wechatUnionId
        ? unionIdToOpenId.get(u.wechatUnionId)
        : undefined;
      if (openId && u.wechatOpenId !== openId) {
        await saveWeChatOpenIdForUnionId(u.wechatUnionId!, openId, transaction);
      }
    }
  }

  lastSyncedUnionIdToOpenId = unionIdToOpenId;
  return unionIdToOpenId;
}

const zTemplateSendResponse = z.object({
  errcode: z.number().optional(),
  errmsg: z.string().optional(),
});

function resolveTargetUrl(url: string | undefined, baseUrl: string): string {
  if (!url) return baseUrl;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${baseUrl.replace(/\/+$/, "")}${url}`;
  return `${baseUrl.replace(/\/+$/, "")}/${url}`;
}

async function sendSingleTemplateMessage(
  openId: string,
  templateId: string,
  url: string,
  data: Record<string, { value: string }>,
) {
  const body = {
    touser: openId,
    template_id: templateId,
    url,
    data,
  };

  let token = await getWeChatAccessToken();
  let response = await axios.post(
    `${WECHAT_API_BASE}/message/template/send`,
    body,
    { params: { access_token: token } },
  );
  let parsed = zTemplateSendResponse.parse(response.data);

  if (parsed.errcode && TOKEN_EXPIRED_CODES.has(parsed.errcode)) {
    token = await getWeChatAccessToken(true);
    response = await axios.post(
      `${WECHAT_API_BASE}/message/template/send`,
      body,
      { params: { access_token: token } },
    );
    parsed = zTemplateSendResponse.parse(response.data);
  }

  if (!parsed.errcode || parsed.errcode === 0) return;

  if (USER_SKIPPABLE_CODES.has(parsed.errcode)) {
    console.log(
      `Skipping WeChat notification for unsubscribed/unavailable openid ` +
        `${openId}: ${parsed.errcode} ${parsed.errmsg ?? ""}`,
    );
    return;
  }

  console.error(
    `WeChat template send failed for openid ${openId}: ` +
      `${parsed.errcode} ${parsed.errmsg ?? ""}`,
  );
}

/**
 * Send WeChat Service Account template notifications to eligible recipients.
 * Errors are logged rather than thrown so a WeChat outage or unsubscribed user
 * never aborts SMS/email delivery or rolls back scheduled-notification rows.
 */
export async function wechat(
  recipients: WeChatRecipient[],
  message: WeChatMessage,
  baseUrl: string,
  transaction?: Transaction,
) {
  // Skip everything in unittest. https://stackoverflow.com/a/29183140
  if (typeof global.it === "function") return;

  if (recipients.length === 0) return;

  const templateId = process.env.WECHAT_NOTIFICATION_TEMPLATE_ID;
  console.log(
    `Sending WeChat notification, template id: ${templateId ?? "(unset)"},` +
      ` recipients: ${recipients.length},` +
      ` message: ${JSON.stringify(message)}`,
  );

  if (!isWeChatNotificationConfigured() || !templateId) {
    console.log("WeChat notification not configured. Skip calling actual API.");
    return;
  }

  try {
    let syncedMap = new Map<string, string>();
    if (recipients.some((r) => !r.wechatOpenId && r.wechatUnionId)) {
      try {
        syncedMap = await syncWeChatFollowerOpenIds(transaction);
      } catch (syncErr) {
        console.error("Failed to sync WeChat follower OpenIDs:", syncErr);
      }
    }

    const openIds = new Set<string>();
    for (const r of recipients) {
      const openId =
        r.wechatOpenId ??
        (r.wechatUnionId ? syncedMap.get(r.wechatUnionId) : undefined);
      if (openId) openIds.add(openId);
    }

    if (openIds.size === 0) {
      console.log("No recipients with resolved WeChat Service Account OpenID.");
      return;
    }

    const url = resolveTargetUrl(message.url, baseUrl);
    const data = buildWeChatTemplateData(message.title, message.content);
    const limit = pLimit(SEND_CONCURRENCY);

    await Promise.all(
      Array.from(openIds).map((openId) =>
        limit(async () => {
          try {
            await sendSingleTemplateMessage(openId, templateId, url, data);
          } catch (err) {
            console.error(
              `Unexpected error sending WeChat notification to ${openId}:`,
              err,
            );
          }
        }),
      ),
    );
  } catch (err) {
    console.error("Unexpected error in wechat() notification channel:", err);
  }
}
