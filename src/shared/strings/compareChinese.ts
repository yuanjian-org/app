export function compareChinese(s1: string | null, s2: string | null): number {
  return (s1 || "").localeCompare(s2 || "", "zh-CN");
}
