import { DateColumn } from "../DateColumn";

// TODO: Sort out this Date-is-not-actually-string nonsense
export function diffInMinutes(from: Date | DateColumn, to: Date | DateColumn) {
  const fromMs =
    from instanceof Date ? from.getTime() : new Date(from).getTime();
  const toMs = to instanceof Date ? to.getTime() : new Date(to).getTime();
  return Math.round((toMs - fromMs) / 60000);
}
