import { DateColumn } from "../DateColumn";
import { getTimestamp } from "./getTimestamp";

export function diffInMinutes(from: Date | DateColumn, to: Date | DateColumn) {
  const fromMs = getTimestamp(from);
  const toMs = getTimestamp(to);
  return Math.round((toMs - fromMs) / 60000);
}
