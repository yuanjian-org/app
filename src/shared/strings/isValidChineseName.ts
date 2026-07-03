export function isValidChineseName(s: string | null): boolean {
  return !!s && s.length >= 2 && /^[一-龥]+$/.test(s);
}
