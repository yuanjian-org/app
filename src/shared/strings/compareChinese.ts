import { toPinyin } from "./toPinyin";

// Need to convert it to pinyin, otherwise the result
// will not be correct if compare Chinese directly. Ref:
// https://www.leevii.com/2023/04/about-the-inaccurate-chinese-sorting-of-localecompare.html
export function compareChinese(s1: string | null, s2: string | null) {
  return toPinyin(s1 || "").localeCompare(toPinyin(s2 || ""));
}
