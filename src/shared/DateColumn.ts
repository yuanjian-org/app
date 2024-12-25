import moment from "moment";
import { z } from "zod";

// We need to coerce Date objects into strings to passed them across RPC calls.
// The default z.coerce.string() transforms Date objects into strings likes
// "Mon Dec 23 2024 16:47:59 GMT-0800 (Pacific Standard Time)" but we want ISO
// strings.
export const zDateColumn = z.preprocess(
  arg => arg instanceof Date ? arg.toISOString() :
    moment.isMoment(arg) ? arg.toISOString() : arg,
  z.coerce.string()
);

export const zOptionalDateColumn = zDateColumn.optional();
export const zNullableDateColumn = zDateColumn.nullable();
export type DateColumn = z.TypeOf<typeof zDateColumn>;
