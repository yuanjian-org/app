export type ApplicationField = {
  name: string,
  jinshujuName?: string,
};

/**
 * Field order dictates the order the fields are displayed.
 */
const menteeApplicationFields: ApplicationField[] = [
  { jinshujuName: "field_165", name: "合作机构来源", },
  { jinshujuName: "field_149", name: "就读种类", },
  { jinshujuName: "field_161", name: "本科是否是第一批次（一本）？", },
  { jinshujuName: "field_107", name: "就读学校", },
  { jinshujuName: "field_108", name: "就读专业", },
  { jinshujuName: "field_167", name: "大学一年级入学年份", },
  { jinshujuName: "field_169", name: "预计毕业年份", },
  { jinshujuName: "field_168", name: "小学、初中、高中", },
  { jinshujuName: "field_156", name: "简历", },
  { jinshujuName: "field_162", name: "简历文件", },
  { jinshujuName: "field_155", name: "个人职业网站 URL（科研组网站、领英等）", },
  { jinshujuName: "field_133", name: "年级总人数", },
  { jinshujuName: "field_134", name: "你在年级的大致排名", },
  { jinshujuName: "field_135", name: "近期各项科目的成绩列表（或者在下方上传近期成绩单）", },
  { jinshujuName: "field_136", name: "近期成绩单（照片或复印件）", },
  { jinshujuName: "field_163", name: "科研论文发表情况（包括发表刊物、作者名单、索引等详细信息。若已在简历中包括，请填 “见简历“）", },
  { jinshujuName: "field_164", name: "获奖情况（若已在简历中包括，请填 “见简历“）", },
  { jinshujuName: "field_139", name: "你最与众不同的品质是什么？", },
  { jinshujuName: "field_140", name: "请例举一到三个最让你为自己感到骄傲的经历或成果。", },
  { jinshujuName: "field_157", name: "请例举并概述你组织或参加社团工作、社会活动、社区服务等的经历和体会。", },
  { jinshujuName: "field_144", name: "你的理想是什么？为什么？如何实现？有可能遇到什么样的困难？如何降低这些困难带来的风险？建议五百字以上：", },
  { jinshujuName: "field_145", name: "你希望远见导师和社区对你的学业、生活、或未来产生什么样的影响？请例举一个希望导师帮助或指导的具体问题或领域。", },
  { jinshujuName: "field_121", name: "户口所在地", },
  { jinshujuName: "field_119", name: "户口类型", },
  { jinshujuName: "field_112", name: "家庭成员", },
  { jinshujuName: "field_127", name: "家庭年收入（元）", },
  { jinshujuName: "field_150", name: "减免后的每年学费（元）", },
  { jinshujuName: "field_151", name: "减免后的每年住宿费（元）", },
  { jinshujuName: "field_152", name: "减免后的每年其他学杂费及生活费估计（元）", },
  { jinshujuName: "field_128", name: "经济困难的原因", },
  { jinshujuName: "field_132", name: "目前已有的经济支持", },
];

export default menteeApplicationFields;
