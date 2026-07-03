import { pinyin } from "pinyin-pro";

export function toPinyin(s: string) {
  return pinyin(s, { toneType: "none", type: "string", v: true }).replace(
    /\s/g,
    "",
  );
}
