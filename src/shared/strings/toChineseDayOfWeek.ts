export function toChineseDayOfWeek(n: number): string {
  return ["一", "二", "三", "四", "五", "六", "日"][n - 1];
}
