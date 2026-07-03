import { z } from "zod";

export const WHITE_LABELS = [
  "yuantu",
  "demo",
  "ustc",
  "xhef",
  "x",
  "yqd",
  "sylp",
] as const;

export const zWhiteLabel = z.enum(WHITE_LABELS);

export type WhiteLabel = z.infer<typeof zWhiteLabel>;

// This constant is needed to enable dead code elimination because bundlers don't evaluate functions.
export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ? "yuantu") as WhiteLabel
