import moment from "moment";
import { DateColumn } from "../DateColumn";

/**
 * Return -1 if d1 is earlier than d2. Treat undefined & null as earliest date.
 *
 * TODO: allow moment objects and remove the stupid `moment(...).toISOString()`
 * form codebase.
 */
export function compareDate(
  d1: Date | DateColumn | undefined | null,
  d2: Date | DateColumn | undefined | null,
) {
  if (d1 == d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;
  return moment(d2).isAfter(moment(d1)) ? -1 : 1;
}
