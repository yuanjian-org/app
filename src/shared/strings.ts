import pinyin from 'tiny-pinyin';
import nzh from 'nzh';
import moment from 'moment';
import crypto from 'crypto';
import stringifyStable from 'json-stable-stringify';

import { NextRouter } from 'next/router';

export function isValidChineseName(s: string | null): boolean {
  return !!s && s.length >= 2 && pinyin.parse(s).every(token => token.type === 2);
}

export function toPinyin(s: string) {
  return pinyin.convertToPinyin(s, /*separator=*/ '', /*lowerCase=*/ true);
}

export function formatUserName(
  name: string | null,
  mood: 'friendly' | 'formal' = "formal"
) {
  if (!name) return '（佚名）';
  return mood === 'friendly' ? name.substring(Math.max(0, name.length - 2)) : name;
}

export function formatGroupName(name: string | null, userCount: number): string {
  return name ?? `${toChinese(userCount)}人通话`;
}

/**
 * Convert a number into Chinese presentation, e.g. "十三".
 */
export function toChinese(n: number): string {
  return nzh.cn.encodeS(n);
}

export function prettifyDuration(from: Date | string, to: Date | string) {
  return `${diffInMinutes(from, to)}分钟`;
}

export function prettifyDate(str: Date | string) {
  const date = new Date(str);
  const now = new Date();
  const dim = diffInMinutes(date, now);
  if (dim < 1) return `刚刚`;
  if (dim < 60) return `${dim} 分钟前`;
  if (dim < 24 * 60) return `${Math.floor(dim / 60)} 小时前`;
  if (dim < 30 * 24 * 60) return `${Math.floor(dim / 24 / 60)} 天前`;
  if (date.getFullYear() == now.getFullYear()) {
    return date.toLocaleDateString('zh-cn', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('zh-cn', { day: 'numeric', month: 'short', year: 'numeric' });
}

// TODO: Sort out this Date-is-not-actually-string nonsense
export function diffInMinutes(from: Date | string, to: Date | string): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 1000 / 60);
}

export function compareDate(d1: string | undefined, d2: string | undefined) {
  if (d1 === d2) return 0;
  return moment(d2).isAfter(moment(d1)) ? 1 : -1;
}

// Need to convert it to pinyin, otherwise the result 
// will not be correct if compare Chinese directly. Ref:
// https://www.leevii.com/2023/04/about-the-inaccurate-chinese-sorting-of-localecompare.html
export function compareChinese(s1: string | null, s2: string | null) {
  return toPinyin(s1 || '').localeCompare(toPinyin(s2 || ''));
}

export function compareUUID(id1: string, id2: string): number {
  return id1.localeCompare(id2);
}

export function parseQueryStringOrUnknown(router: NextRouter, slug: string): string {
  return parseQueryString(router, slug) ?? "unknown";
}

export function parseQueryString(router: NextRouter, slug: string): string | null {
  return typeof router.query[slug] === 'string' ? router.query[slug] as string : null;
}

export function toBase64UrlSafe(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')  // Replace + with -
    .replace(/\//g, '_')  // Replace / with _
    .replace(/=+$/, '');  // Remove padding
}

export function fromBase64UrlSafe(base64: string): string {
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString();
}

export function shaChecksum(obj: Record<string, any>): string {
  return crypto.createHash('sha256').update(stringifyStable(obj)).digest('hex');
}

export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.substring(0, maxLen) + "……";
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
