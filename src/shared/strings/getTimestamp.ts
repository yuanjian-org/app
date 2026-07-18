import { DateColumn } from "../DateColumn";

export function getTimestamp(val: Date | DateColumn | unknown): number {
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
