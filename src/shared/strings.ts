import pinyin from 'tiny-pinyin';
import nzh from 'nzh';
import moment from 'moment';

export const stringOrEmpty = (value: string | undefined) => {
  return value ? value : ''
};

export function isValidChineseName(s: string | null): boolean {
  return !!s && s.length >= 2 && pinyin.parse(s).every(token => token.type === 2);
}

export function toPinyin(s: string) {
  return pinyin.convertToPinyin(s, /*separator=*/ '', /*lowerCase=*/ true);
}

export function formatUserName(name: string | null, mood: 'friendly' | 'formal') {
  if (!name) return '无名氏';
  return mood === 'friendly' ? name.substring(Math.max(0, name.length - 2)) : name;
}

export function formatGroupName(name: string | null, userCount: number): string {
  return name ?? (userCount <= 2 ? '一对一通话' : `${nzh.cn.encodeS(userCount)}人通话`);
}

export function prettifyDuration(startedAt: Date, endedAt: Date) {
  return `${Math.floor(moment.duration(moment(endedAt).diff(startedAt)).asMinutes())} 分钟`;
}

function capitalizeFirstChar(str : string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function prettifyDate(date: Date) {
  return capitalizeFirstChar(moment(date).fromNow())
}
