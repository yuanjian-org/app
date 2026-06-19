import { z } from "zod";

export const WHITE_LABELS = [
  "yuantu",
  "demo",
  "ustc",
  "xhef",
  "x",
  "yiqidu",
  "sylp",
] as const;

export const zWhiteLabel = z.enum(WHITE_LABELS);

export type WhiteLabel = z.infer<typeof zWhiteLabel>;
