import { DateColumn } from "../DateColumn";
import { diffInMinutes } from "./diffInMinutes";

export function prettifyDuration(
  from: Date | DateColumn,
  to: Date | DateColumn,
) {
  return `${diffInMinutes(from, to)}分钟`;
}
