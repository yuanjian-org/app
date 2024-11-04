import { z } from "zod";

const zStr = z.string().optional();

export const zMentorProfile = z.object({
  '最多匹配学生': z.number().optional(),
  '不参加就业辅导': z.boolean().optional(),

  '现居住地': zStr,
  '曾居住地': zStr,
  '成长亮点': zStr,
  '教育经历': zStr,
  '职业经历': zStr,
  '个性特点': zStr,
  '爱好与特长': zStr,
  '喜爱读物': zStr,
  '生活日常': zStr,
  '擅长辅导领域': zStr,

  '照片链接': zStr,
  '简历链接': zStr,
});
export type MentorProfile = z.TypeOf<typeof zMentorProfile>;
