import { z } from "zod";

const zStr = z.string().optional();

export const zProjectProfile = z.object({
  简介: zStr,
  背景: zStr,
  挑战描述: zStr,
  视频链接: zStr,
  学生要求: zStr,
  参考材料: zStr,
});

export type ProjectProfile = z.TypeOf<typeof zProjectProfile>;
