import { z } from "zod";

const zStr = z.string().optional();

export const zMentorProfile = z.object({
  '身份头衔': zStr,
  '现居住地': zStr,
  '曾居住地': zStr,
  '成长亮点': zStr,
  '教育经历': zStr,
  '职业经历': zStr,
  '个性特点': zStr,
  '爱好与特长': zStr,
  '喜爱读物': zStr,
  '生活日常': zStr,
  '擅长话题': zStr,

  '照片链接': zStr,

  // Unused / deprecated
  '擅长辅导领域': zStr,
});
export type MentorProfile = z.TypeOf<typeof zMentorProfile>;
