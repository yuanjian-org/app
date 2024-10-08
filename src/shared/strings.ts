import pinyin from 'tiny-pinyin';
import nzh from 'nzh';
import moment from 'moment';

import { NextRouter } from 'next/router';

export function isValidChineseName(s: string | null): boolean {
  return !!s && s.length >= 2 && pinyin.parse(s).every(token => token.type === 2);
}

export function toPinyin(s: string) {
  return pinyin.convertToPinyin(s, /*separator=*/ '', /*lowerCase=*/ true);
}

export function formatUserName(name: string | null, mood?: 'friendly' | 'formal') {
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

export function sortByDateDesc(contents: any[]) : void{
  contents.sort((a, b) => {
    const aProp = a.updatedAt? 'updatedAt' : 'createdAt';
    const bProp = b.updatedAt? 'updatedAt' : 'createdAt';
    return moment(a[aProp]).isAfter(moment(b[bProp])) ? -1 : 1;
  });
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
