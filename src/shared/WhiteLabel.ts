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

/**
 * N.B. Some places in the codebase use process.env to get features directly to
 * enable dead code elimination or DCE (Tree Shaking isn't smart enough to
 * dereference constants at build time). Please keep them in sync.
 */
export const whiteLabel = (process.env.NEXT_PUBLIC_WHITE_LABEL ||
  "yuantu") as WhiteLabel;
