import { procedure } from "../trpc";
import z from "zod";
import { generalBadRequestError } from "../errors";
import { createUser } from "../database/models/User";

/**
 * The Webhook for 金数据 submissions form https://jinshuju.net/f/FBTWTe
 */
export default procedure
  .input(z.record(z.string()))
  .mutation(async ({ input }) => submit(input));

export async function submit({ form, entry }: Record<string, any>) {
  if (form !== "FBTWTe") {
    throw generalBadRequestError("This webhook only accepts callbacks from https://jinshuju.net/f/FBTWTe.");
  }

  /**
   * Missing keys will be ignored
   */
  const otherKeys: Record<string, string> = {
    "field_165":  "合作机构来源",
    "field_149":  "就读种类",
    "field_161":  "本科是否是第一批次（一本）？",
    "field_107":  "就读学校",
    "field_108":  "就读专业",
    "field_167":  "大学一年级入学年份",
    "field_169":  "预计毕业年份",
    "field_168":  "小学、初中、高中",
    "field_156":  "简历",
    "field_162":  "简历文件",
    "field_155":  "个人职业网站 URL（科研组网站、领英等）",
    "field_133":  "年级总人数",
    "field_134":  "你在年级的大致排名",
    "field_135":  "近期各项科目的成绩列表（或者在下方上传近期成绩单）",
    "field_136":  "近期成绩单（照片或复印件）",
    "field_163":  "科研论文发表情况（包括发表刊物、作者名单、索引等详细信息。若已在简历中包括，请填 “见简历“）",
    "field_164":  "获奖情况（若已在简历中包括，请填 “见简历“）",
    "field_139":  "你最与众不同的品质是什么？",
    "field_140":  "请例举一到三个最让你为自己感到骄傲的经历或成果。",
    "field_157":  "请例举并概述你组织或参加社团工作、社会活动、社区服务等的经历和体会。",
    "field_144":  "你的理想是什么？为什么？如何实现？有可能遇到什么样的困难？如何降低这些困难带来的风险？建议五百字以上：",
    "field_145":  "你希望远见导师和社区对你的学业、生活、或未来产生什么样的影响？请例举一个希望导师帮助或指导的具体问题或领域。",
    "field_121":  "户口所在地",
    "field_119":  "户口类型",
    "field_112":  "家庭成员",
    "field_127":  "家庭年收入（元）",
    "field_150":  "减免后的每年学费（元）",
    "field_151":  "减免后的每年住宿费（元）",
    "field_152":  "减免后的每年其他学杂费及生活费估计（元）",
    "field_128":  "经济困难的原因",
    "field_132":  "目前已有的经济支持",
  };

  const application: Record<string, any> = {};
  for (const formKey of Object.keys(otherKeys)) {
    if (formKey in entry) {
      application[otherKeys[formKey]] = entry[formKey];
    }
  }

  await createUser({
    name: entry.field_104,
    sex: entry.field_57,
    email: entry.field_113,
    wechat: entry.field_106,
    menteeApplication: application,
    roles: ["Mentee"]
  });
}
