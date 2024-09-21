export type MenteeApplicationField = {
  name: string,

  // Always show the field on the "edit application" page even if the field is
  // absent from application data.
  showForEdits?: boolean,

  // field name from Yuanjian application form https://jsj.top/f/FBTWTe or
  // Sizhu application form https://jsj.top/f/Z82u8w. 
  //
  // N.B.: We must maintain the invariant that for a given field name, either it
  //    is present only in one of the two forms, or it refers to identical 
  //    fields from both forms.
  //
  jsjField?: string,

  // field name from Proxied application form https://jsj.top/f/S74k0V
  jsjProxiedField?: string,
};

export const menteeSourceField = "合作机构来源";
export const menteeAcceptanceYearField = "录取届";
export const menteeCollegeField = "就读学校";
export const menteeMajorField = "就读专业";
export const menteeDegreeField = "就读种类";
export const menteeFirstYearInCollegeField = "大学一年级入学年份";

/**
 * Field order dictates the order the fields are displayed.
 */
const menteeApplicationFields: MenteeApplicationField[] = [
  { name: menteeAcceptanceYearField, showForEdits: true, },
  { jsjField: "field_165", jsjProxiedField: "field_165", name: menteeSourceField, showForEdits: true, },
  { jsjField: "field_149", jsjProxiedField: "field_149", name: menteeDegreeField, showForEdits: true, },
  { jsjField: "field_161", name: "本科是否是第一批次（一本）？", showForEdits: true, },
  { jsjField: "field_107", jsjProxiedField: "field_108", name: menteeCollegeField, showForEdits: true, },
  { jsjField: "field_108", jsjProxiedField: "field_172", name: menteeMajorField, showForEdits: true, },
  { jsjField: "field_167", jsjProxiedField: "field_167", name: menteeFirstYearInCollegeField, showForEdits: true, },
  { jsjField: "field_169", name: "预计毕业年份", showForEdits: true, },
  { jsjProxiedField: "field_173", name: "合作机构推荐文字", showForEdits: true, },

  { jsjField: "field_170", name: "国籍", }, // Only in Sizhu application form

  { jsjField: "field_168", name: "小学、初中、高中", },
  { jsjField: "field_156", name: "简历", },
  { jsjField: "field_162", name: "简历文件", },
  { jsjProxiedField: "field_170", name: "申请表", },
  { jsjProxiedField: "field_171", name: "其他申请材料", },
  { jsjField: "field_155", name: "个人职业网站 URL（科研组网站、领英等）", },
  { jsjField: "field_133", name: "年级总人数", },
  { jsjField: "field_134", name: "你在年级的大致排名", },
  { jsjField: "field_135", name: "近期各项科目的成绩列表（或者在下方上传近期成绩单）", },
  { jsjField: "field_136", name: "近期成绩单（照片或复印件）", },
  { jsjField: "field_163", name: "科研论文发表情况（包括发表刊物、作者名单、索引等详细信息。若已在简历中包括，请填 “见简历“）", },
  { jsjField: "field_164", name: "获奖情况（若已在简历中包括，请填 “见简历“）", },
  { jsjField: "field_139", name: "你最与众不同的品质是什么？", },
  { jsjField: "field_140", name: "请例举一到三个最让你为自己感到骄傲的经历或成果。", },
  { jsjField: "field_157", name: "请例举并概述你组织或参加社团工作、社会活动、社区服务等的经历和体会。", },
  { jsjField: "field_144", name: "你的理想是什么？为什么？如何实现？有可能遇到什么样的困难？如何降低这些困难带来的风险？建议五百字以上：", },
  { jsjField: "field_145", name: "你希望导师和社区对你的学业、生活、或未来产生什么样的影响？请例举一个希望导师帮助或指导的具体问题或领域。", },
  { jsjField: "field_121", name: "户口所在地", },
  { jsjField: "field_119", name: "户口类型", },
  { jsjField: "field_112", name: "家庭成员", },
  { jsjField: "field_127", name: "家庭年收入（元）", },
  { jsjField: "field_150", name: "减免后的每年学费（元）", },
  { jsjField: "field_151", name: "减免后的每年住宿费（元）", },
  { jsjField: "field_152", name: "减免后的每年其他学杂费及生活费估计（元）", },
  { jsjField: "field_128", name: "经济困难的原因", },
  { jsjField: "field_132", name: "目前已有的经济支持", },
];

export default menteeApplicationFields;
