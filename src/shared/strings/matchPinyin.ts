import { toPinyin } from "./toPinyin";

export function matchPinyin(
  searchTerm: string,
  text: string | null | undefined,
): boolean {
  if (!text) return false;
  const lowerSearch = searchTerm.trim().toLowerCase();
  const lowerText = text.toLowerCase();
  // Note that `toPinyin('Abc') returns 'Abc' without case change.
  return [lowerText, toPinyin(lowerText)].some((s) => s.includes(lowerSearch));
}
