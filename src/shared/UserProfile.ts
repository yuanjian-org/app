import { z } from "zod";
import { zMinUser } from "./User";

const zStr = z.string().optional();
export const zPicParams = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
}).optional();

export const zUserProfile = z.object({
  '性别': zStr,
  '英文别名': zStr,
  '身份头衔': zStr,
  '现居住地': zStr,
  '曾居住地': zStr,
  '专业领域': zStr,
  '成长亮点': zStr,
  '教育经历': zStr,
  '职业经历': zStr,
  '个性特点': zStr,
  '爱好与特长': zStr,
  '喜爱读物': zStr,
  '生活日常': zStr,
  '擅长话题': zStr,

  '照片链接': zStr,
  '照片参数': zPicParams,

  // Unused / deprecated
  '擅长辅导领域': zStr,
});
export type UserProfile = z.TypeOf<typeof zUserProfile>;

export const zMinUserAndProfile = z.object({
  user: zMinUser,
  profile: zUserProfile,
});
export type MinUserAndProfile = z.TypeOf<typeof zMinUserAndProfile>;
