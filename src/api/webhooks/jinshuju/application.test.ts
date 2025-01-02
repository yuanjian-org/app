import { expect } from 'chai';
import User from '../../database/models/User';
import { submit } from '.';

const inputMenteeApp = {
  "form": "FBTWTe",
  "form_name": "奖学金申请表",
  "entry": {
    "token": "4xXItIN1",
    "serial_number": 141,
    "field_104": "丁一",
    "field_57": "女",
    "field_110": "",
    "field_106": "微信号",
    "field_113": "test1@email.com",
    "field_61": "",
    "field_165": "某基金会: 某ID",
    "field_149": "全日制大学专科生",
    "field_161": "是",
    "field_107": "就读学校",
    "field_108": "就读专业",
    "field_167": 2008,
    "field_169": 2009,
    "field_120": "",
    "field_158": "",
    "field_124": "",
    "field_111": "",
    "field_168": "省份 城市 小学名称\n省份 城市 初中名称\n省份 城市 高中名称",
    "field_156": "简历文字",
    "field_162": [
      "https://some.url1"
    ],
    "field_155": "职业网站URL",
    "field_133": 123,
    "field_134": 456,
    "field_135": "科研列表",
    "field_136": [
      "https://some.url2"
    ],
    "field_163": "论文列表",
    "field_164": "获奖情况",
    "field_139": "不同品质",
    "field_140": "骄傲经历",
    "field_157": "社团工作",
    "field_154": "",
    "field_141": "",
    "field_144": "理想",
    "field_145": "影响",
    "field_160": [],
    "field_121": "户口",
    "field_119": "农村",
    "field_112": [
      {
        "statement": "姓名",
        "dimensions": {
          "成员一": "成员一",
          "成员二": "成员二"
        }
      },
      {
        "statement": "年龄",
        "dimensions": {
          "成员一": "年龄一",
          "成员二": "年龄二"
        }
      },
      {
        "statement": "与你的关系",
        "dimensions": {
          "成员一": "关系一",
          "成员二": "关系二"
        }
      },
      {
        "statement": "职业",
        "dimensions": {
          "成员一": "职业一",
          "成员二": "职业二"
        }
      },
      {
        "statement": "工作或学习单位",
        "dimensions": {
          "成员一": "单位一",
          "成员二": "单位二"
        }
      },
      {
        "statement": "健康情况",
        "dimensions": {
          "成员一": "健康一",
          "成员二": "健康二"
        }
      }
    ],
    "field_127": "678",
    "field_150": "789",
    "field_151": "234",
    "field_152": "456",
    "field_128": [
      "本人或亲属遭遇重大疾病或伤害（选中后输入具体情况）: 疾病",
      "烈士子女"
    ],
    "field_132": [
      "父母或亲属资助",
      "打工（选中后输入工作性质及每周平均时数）: 打工"
    ],
    "field_159": [
      "我保证填写信息的真实性，并已阅读及同意以上《隐私政策与条款》。"
    ],
    "x_field_1": "",
    "color_mark": "",
    "x_field_weixin_nickname": "",
    "x_field_weixin_gender": "",
    "x_field_weixin_country": "",
    "x_field_weixin_province_city": {},
    "x_field_weixin_openid": "",
    "x_field_weixin_unionid": "",
    "x_field_weixin_headimgurl": "",
    "creator_name": "tester@gmail.com",
    "created_at": "2023-07-21T03:36:09.016Z",
    "updated_at": "2023-07-21T03:36:09.016Z",
    "referred_from": "",
    "referred_from_associated_serial_number": null,
    "referral_users_count": null,
    "referral_link": "http://jinshuju.net/f/...",
    "referral_poster_url": "",
    "distribution_red_envelope_total_amount": null
  }
};

const outputMenteeApp = {
  "合作机构来源": "某基金会: 某ID",
  "就读种类": "全日制大学专科生",
  "本科是否是第一批次（一本）？": "是",
  "就读学校": "就读学校",
  "就读专业": "就读专业",
  "大学一年级入学年份": 2008,
  "预计毕业年份": 2009,
  "小学、初中、高中": "省份 城市 小学名称\n省份 城市 初中名称\n省份 城市 高中名称",
  "简历": "简历文字",
  "简历文件": [
    "https://some.url1"
  ],
  "个人职业网站 URL（科研组网站、领英等）": "职业网站URL",
  "年级总人数": 123,
  "你在年级的大致排名": 456,
  "近期各项科目的成绩列表（或者在下方上传近期成绩单）": "科研列表",
  "近期成绩单（照片或复印件）": [
    "https://some.url2"
  ],
  "科研论文发表情况（包括发表刊物、作者名单、索引等详细信息。若已在简历中包括，请填 “见简历“）": "论文列表",
  "获奖情况（若已在简历中包括，请填 “见简历“）": "获奖情况",
  "你最与众不同的品质是什么？": "不同品质",
  "请例举一到三个最让你为自己感到骄傲的经历或成果。": "骄傲经历",
  "请例举并概述你组织或参加社团工作、社会活动、社区服务等的经历和体会。": "社团工作",
  "你的理想是什么？为什么？如何实现？有可能遇到什么样的困难？如何降低这些困难带来的风险？建议五百字以上：": "理想",
  "你希望导师和社区对你的学业、生活、或未来产生什么样的影响？请例举一个希望导师帮助或指导的具体问题或领域。": "影响",
  "户口所在地": "户口",
  "户口类型": "农村",
  "家庭成员": [
    {
      "statement": "姓名",
      "dimensions": {
        "成员一": "成员一",
        "成员二": "成员二"
      }
    },
    {
      "statement": "年龄",
      "dimensions": {
        "成员一": "年龄一",
        "成员二": "年龄二"
      }
    },
    {
      "statement": "与你的关系",
      "dimensions": {
        "成员一": "关系一",
        "成员二": "关系二"
      }
    },
    {
      "statement": "职业",
      "dimensions": {
        "成员一": "职业一",
        "成员二": "职业二"
      }
    },
    {
      "statement": "工作或学习单位",
      "dimensions": {
        "成员一": "单位一",
        "成员二": "单位二"
      }
    },
    {
      "statement": "健康情况",
      "dimensions": {
        "成员一": "健康一",
        "成员二": "健康二"
      }
    }
  ],
  "家庭年收入（元）": "678",
  "减免后的每年学费（元）": "789",
  "减免后的每年住宿费（元）": "234",
  "减免后的每年其他学杂费及生活费估计（元）": "456",
  "经济困难的原因": [
    "本人或亲属遭遇重大疾病或伤害（选中后输入具体情况）: 疾病",
    "烈士子女"
  ],
  "目前已有的经济支持": [
    "父母或亲属资助",
    "打工（选中后输入工作性质及每周平均时数）: 打工"
  ]
};

const inputProxiedMenteeApp = {
  "form": "S74k0V",
  "form_name": "代理申请表",
  "entry": {
    "token": "CyfYLp4B",
    "serial_number": 1,
    "field_104": "王小汉",
    "field_57": "男",
    "field_106": "微信号2",
    "field_113": "test2@email.com",
    "field_165": "树华教育基金会: 12-1234",
    "field_149": "全日制大学专科生",
    "field_108": "不知道学校",
    "field_172": "不知道专业",
    "field_167": 2022,
    "field_170": [
      "foo",
      "bar",
    ],
    "field_171": [
      "baz",
      "qux",
      "noz",
    ],
  }
};

const outputProxiedMenteeApp = {
  "其他申请材料": [
    "baz",
    "qux",
    "noz",
  ],
  "合作机构来源": "树华教育基金会: 12-1234",
  "大学一年级入学年份": 2022,
  "就读专业": "不知道专业",
  "就读学校": "不知道学校",
  "就读种类": "全日制大学专科生",
  "申请表": [
    "foo",
    "bar",
  ],
};

describe('submitApplication', () => {
  after(async () => {
    const u1 = await User.findOne({ where: { email: "test1@email.com" } });
    if (u1) await u1.destroy({ force: true });
    const u2 = await User.findOne({ where: { email: "test2@email.com" } });
    if (u2) await u2.destroy({ force: true });
  });

  it('should submit mentee application', async () => {
    await submit(inputMenteeApp);
    const u = await User.findOne({ where: { email: "test1@email.com" } });
    expect(u).is.not.null;
    expect(u?.pinyin).is.equal("dingyi");
    expect(u?.profile?.性别).is.equal("女");
    expect(u?.wechat).is.equal("微信号");
    expect(u?.menteeApplication).is.deep.equal(outputMenteeApp);
  });

  it('should submit proxied mentee application', async () => {
    await submit(inputProxiedMenteeApp);
    const u = await User.findOne({ where: { email: "test2@email.com" } });
    expect(u).is.not.null;
    expect(u?.pinyin).is.equal("wangxiaohan");
    expect(u?.profile?.性别).is.equal("男");
    expect(u?.wechat).is.equal("微信号2");
    expect(u?.menteeApplication).is.deep.equal(outputProxiedMenteeApp);
  });
});
