import { DateColumn } from "../DateColumn";

/**
 * Return -1 if d1 is earlier than d2. Treat undefined & null as earliest date.
 *
 * We avoid importing `moment` here to prevent bundling the entire ~280 KB
 * moment library into client bundles for simple date comparisons.
 */
function getTimestamp(val: Date | DateColumn | unknown): number {
  if (val instanceof Date) return val.getTime();
  if (typeof val === "string" || typeof val === "number") {
    return new Date(val).getTime();
  }
  if (
    val &&
    typeof (val as { valueOf?: () => number }).valueOf === "function"
  ) {
    return Number((val as { valueOf: () => number }).valueOf());
  }
  return 0;
}

export function compareDate(
  d1: Date | DateColumn | undefined | null,
  d2: Date | DateColumn | undefined | null,
) {
  if (d1 == d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;
  const t1 = getTimestamp(d1);
  const t2 = getTimestamp(d2);
  if (t1 === t2) return 0;
  return t2 > t1 ? -1 : 1;
}
