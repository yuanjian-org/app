import pinyin from "tiny-pinyin";
import nzh from "nzh";
import moment from "moment";
import crypto from "crypto";
import stringifyStable from "json-stable-stringify";

import { NextRouter } from "next/router";
import { DateColumn } from "./DateColumn";
import z from "zod";

export const notSetText = "未设置";

export function isValidChineseName(s: string | null): boolean {
  return (
    !!s && s.length >= 2 && pinyin.parse(s).every((token) => token.type === 2)
  );
}

export function toPinyin(s: string) {
  return pinyin.convertToPinyin(s, /*separator=*/ "", /*lowerCase=*/ true);
}

/**
 * Use <UserName> instead in frontend code.
 */
export function formatUserName(
  name: string | null,
  mode: "friendly" | "formal" = "formal",
) {
  if (!name) return "（佚名）";
  return mode === "friendly"
    ? name.substring(Math.max(0, name.length - 2))
    : name;
}

export function formatGroupName(
  name: string | null,
  userCount: number,
): string {
  return name ?? `${toChineseNumber(userCount)}人通话`;
}

/**
 * Convert a number into Chinese presentation, e.g. "十三".
 */
export function toChineseNumber(n: number): string {
  return nzh.cn.encodeS(n);
}

export function toChineseDayOfWeek(n: number): string {
  return ["一", "二", "三", "四", "五", "六", "日"][n - 1];
}

export function prettifyDuration(
  from: Date | DateColumn,
  to: Date | DateColumn,
) {
  return `${diffInMinutes(from, to)}分钟`;
}

export function prettifyDate(str: Date | DateColumn) {
  const date = new Date(str);
  const now = new Date();
  const dim = diffInMinutes(date, now);
  if (dim < -24 * 60) return `${Math.floor(-dim / 24 / 60)} 天后`;
  if (dim < -60) return `${Math.floor(-dim / 60)} 小时后`;
  if (dim < 0) return `${-dim} 分钟后`;
  if (dim < 1) return `刚刚`;
  if (dim < 60) return `${dim} 分钟前`;
  if (dim < 24 * 60) return `${Math.floor(dim / 60)} 小时前`;
  if (dim < 30 * 24 * 60) return `${Math.floor(dim / 24 / 60)} 天前`;
  if (date.getFullYear() == now.getFullYear()) {
    return date.toLocaleDateString("zh-cn", { day: "numeric", month: "short" });
  } else {
    return date.toLocaleDateString("zh-cn", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

// TODO: Sort out this Date-is-not-actually-string nonsense
export function diffInMinutes(from: Date | DateColumn, to: Date | DateColumn) {
  return Math.floor(
    (new Date(to).getTime() - new Date(from).getTime()) / 1000 / 60,
  );
}

/**
 * Return -1 if d1 is earlier than d2. Treat undefined & null as earliest date.
 *
 * TODO: allow moment objects and remove the stupid `moment(...).toISOString()`
 * form codebase.
 */
export function compareDate(
  d1: Date | DateColumn | undefined | null,
  d2: Date | DateColumn | undefined | null,
) {
  if (d1 == d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;
  return moment(d2).isAfter(moment(d1)) ? -1 : 1;
}

// Need to convert it to pinyin, otherwise the result
// will not be correct if compare Chinese directly. Ref:
// https://www.leevii.com/2023/04/about-the-inaccurate-chinese-sorting-of-localecompare.html
export function compareChinese(s1: string | null, s2: string | null) {
  return toPinyin(s1 || "").localeCompare(toPinyin(s2 || ""));
}

export function compareUUID(id1: string, id2: string): number {
  return id1.localeCompare(id2);
}

export function parseQueryString(router: NextRouter, slug: string) {
  return typeof router.query[slug] === "string"
    ? (router.query[slug] as string)
    : undefined;
}

export function toBase64UrlSafe(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-") // Replace + with -
    .replace(/\//g, "_") // Replace / with _
    .replace(/=+$/, ""); // Remove padding
}

export function fromBase64UrlSafe(base64: string): string {
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString();
}

export function shaChecksum(obj: Record<string, any>): string {
  return crypto.createHash("sha256").update(stringifyStable(obj)).digest("hex");
}

// Simple hash function to generate a number from a string
export function hash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export const passwordMinLength = 8;

// TODO check against common passwords
export function isValidPassword(password: string): boolean {
  return password.length >= passwordMinLength && password.length < 80;
}

export function getColorFromText(text: string): string {
  const colors = [
    "red",
    "orange",
    "yellow",
    "green",
    "teal",
    "blue",
    "cyan",
    "purple",
  ];
  const index = Math.abs(hash(text)) % colors.length;
  return colors[index];
}

export const chinaPhonePrefix = "+86";

export function removeChinaPhonePrefix(v: string | null) {
  if (v && v.startsWith(chinaPhonePrefix)) {
    return v.slice(chinaPhonePrefix.length);
  } else {
    return v;
  }
}

export function isValidPhone(v: string): boolean {
  if (v.startsWith(chinaPhonePrefix)) {
    return /^1[3-9]\d{9}$/.test(v.slice(chinaPhonePrefix.length));
  } else if (!v.startsWith("+")) {
    return false;
  } else {
    // Use a heuristic. No need for strict checking as the system will verify
    // the phone number via SMS.
    return v.length >= 8;
  }
}

export function isValidEmail(email: string) {
  return z.string().email().safeParse(email).success;
}
