import { toChineseNumber } from "./toChineseNumber";

export function formatGroupName(
  name: string | null,
  userCount: number,
): string {
  return name ?? `${toChineseNumber(userCount)}人通话`;
}
