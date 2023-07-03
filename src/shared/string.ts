import pinyin from 'tiny-pinyin';

export const stringOrEmpty = (value: string | undefined) => {
  return value ? value : ''
};

export function capitalizeFirstChar(str : string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isValidChineseName(s: string | null): boolean {
  return !!s && s.length >= 2 && pinyin.parse(s).every(token => token.type === 2);
}
