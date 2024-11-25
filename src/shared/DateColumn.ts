import { z } from "zod";

// For some reason coerce is needed to avoid zod input validation error.
// TODO: figure out this nonsense, and also the optional / nullable nonsense.
export const zDateColumn = z.coerce.string();
export const zOptionalDateColumn = zDateColumn.optional();
export const zNullableDateColumn = zDateColumn.nullable();
export type DateColumn = z.TypeOf<typeof zOptionalDateColumn>;
