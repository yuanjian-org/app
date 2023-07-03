import nzh from 'nzh';

export function formatGroupName(name: string | null, userCount: number): string {
  return name ?? (userCount <= 2 ? '一对一通话' : `${nzh.cn.encodeS(userCount)}人通话`);
}

export function formatUserName(name: string | null, mood: 'friendly' | 'formal') {
  if (!name) return '无名氏';
  return mood === 'friendly' ? name.substring(Math.max(0, name.length - 2)) : name;
}
