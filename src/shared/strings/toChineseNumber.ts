import nzh from "nzh";

/**
 * Convert a number into Chinese presentation, e.g. "十三".
 */
export function toChineseNumber(n: number): string {
  return nzh.cn.encodeS(n);
}
