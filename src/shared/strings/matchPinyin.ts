import { toPinyin } from "./toPinyin";

export function matchPinyin(
  lowerSearch: string,
  text: string | null | undefined,
): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return [lowerText, toPinyin(lowerText)].some((s) => s.includes(lowerSearch));
}
