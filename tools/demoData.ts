import { UserProfile } from "../src/shared/UserProfile";
import {
  menteeAcceptanceYearField,
  menteeCollegeField,
  menteeDegreeField,
  menteeFirstYearInCollegeField,
  menteeMajorField,
  menteeSourceField,
} from "../src/shared/applicationFields";
import { MenteeStatus } from "../src/shared/MenteeStatus";
import Role, { AllRoles } from "../src/shared/Role";
import moment from "moment";

export type DemoUser = {
  name: string,
  email: string,
  id?: string,
  roles?: Role[],
  volunteerApplication?: Record<string, any> | null,
  menteeApplication?: Record<string, any> | null;
  menteeStatus?: MenteeStatus | null,
  profile?: UserProfile | null,
};

const menteeApplication: Record<string, any> = {
  [menteeAcceptanceYearField]: "2025",
  [menteeSourceField]: "远见教育基金会",
  [menteeCollegeField]: "中国农业大学",
  [menteeMajorField]: "公共卫生学",
  [menteeDegreeField]: "本科",
  [menteeFirstYearInCollegeField]: "2024",
};

const adminProfile: UserProfile = {
  "性别": "男",
  "身份头衔": "远图管理员",
  "专业领域": "网站开发与运营",
  "职业经历": "远见教育基金会大码农",
  "现居住地": "北京",
  "爱好与特长": "电竞、旅行",
  "生活日常": "特别喜欢去电影院看电影，一周看一到两场，去年瘸腿期间乘家裡人睡著拄着拐杖也要偷偷去看，进到影院是全然的享受也是充电",
};

const mentorProfile: UserProfile = {
  "性别": "女",
  "专业领域": "互联网与信息技术、科技",
  "个性特点": "有活力、关心他人、善良勇敢、有主见、好奇心、直接真诚",
  "喜爱读物": "《悉达多》 - 黑塞\n《西方现代思想讲义》 - 刘擎\n\n《霸王别姬》《熔炉》《绿皮书》《请你以我的名字呼唤我》诺兰、宫崎骏的大部分电影\n",
  "成长亮点": "几年前山火烧到离我家很近的地方 需要紧急撤离 意识到生活很久的家可能一夜之间化为灰烬 让我深刻反思了人生的无常 \n\n成就如沙堡 人生如海浪 \n慢慢的学会接受变化 爱自己 享受结果的同时学习享受过程 ",
  "擅长话题": "人生思考 社会时事 领导力 美食 旅行 电影 音乐 锻炼 时尚 探险",
  "教育经历": "卡内基梅隆计算机专业硕士，拥有北京邮电大学电信工程和英国玛丽女皇学院管理双学位。",
  "曾居住地": "北京 匹兹堡 硅谷",
  "照片链接": "https://user-assets.sxlcdn.com/images/937504/FqrY3ykviBotL-y4ckfgMZ1I783Q.png?imageMogr2/strip/auto-orient/thumbnail/500x1000%3E/quality/90!/format/png",
  "现居住地": "硅谷",
  "生活日常": "我有一只10个月大的伯恩山贵宾（行走的毛绒玩具）\n\n喜欢音乐（音乐节 音乐剧）\n",
  "职业经历": "现任谷歌技术主管经理，是Google Nest智能家居核心模块技术负责人。专注于智能语音交互、用户体验和前端开发，多次在谷歌内部担任项目导师。曾在甲骨文任职。",
  "英文别名": "Christina ",
  "身份头衔": "谷歌智能家居核心模块技术主管经理",
  "爱好与特长": "零食、看show、电影、乐器、旅行、看书、潜水",
  "擅长辅导领域": "职业规划，女性领导力，多元化教育"
};

const users: Record<string, DemoUser> = {
  admin: {
    name: '管理员',
    email: 'admin@de.mo',
    roles: AllRoles.filter(role => !["Banned", "Mentee", "TransactionalMentor", "MentorCoach"]
      .includes(role)),
    profile: adminProfile,
  },
  mentee1: {
    name: '甲学生',
    email: 'mentee1@de.mo',
    roles: ["Mentee"] as Role[],
    menteeStatus: "现届学子" as MenteeStatus,
    menteeApplication,
  },
  mentee2: {
    name: '乙学生',
    email: 'mentee2@de.mo',
    roles: ["Mentee"] as Role[],
    menteeStatus: "现届学子" as MenteeStatus,
    menteeApplication,
  },
  mentee3: {
    name: '丙学生',
    email: 'mentee3@de.mo',
    roles: ["Mentee"] as Role[],
    menteeStatus: "现届学子" as MenteeStatus,
    menteeApplication,
  },
  mentee4: {
    name: '丁学生',
    email: 'mentee4@de.mo',
    roles: ["Mentee"] as Role[],
    menteeStatus: null,
    menteeApplication,
  },
  mentee5: {
    name: '戊学生',
    email: 'mentee5@de.mo',
    roles: ["Mentee"] as Role[],
    menteeStatus: null,
    menteeApplication,
  },

  mentor1: {
    name: '丙导师',
    email: 'mentor1@de.mo',
    roles: ["Mentor", "Volunteer"] as Role[],
    profile: mentorProfile,
  },
  mentor2: {
    name: '丁导师',
    email: 'mentor2@de.mo',
    roles: ["Mentor", "Volunteer"] as Role[],
    profile: adminProfile,
  },
  mentor3: {
    name: '戊导师',
    email: 'mentor3@de.mo',
    roles: ["Mentor", "Volunteer"] as Role[],
    profile: mentorProfile,
  },
  mentor4: {
    name: '己导师',
    email: 'mentor4@de.mo',
    roles: ["Mentor", "Volunteer"] as Role[],
    profile: mentorProfile,
  },
  mentor5: {
    name: '庚导师',
    email: 'mentor5@de.mo',
    roles: ["Mentor", "Volunteer"] as Role[],
    profile: adminProfile,
  },
};

const summary1md = `
发言时长（分钟)：导师：24，学生：30

### 会议摘要

**思想碰撞与生活经验的分享**

这段对话主要围绕个人生活、家庭关系和工作规划等方面展开。参与者分享了自己的经历和看法，如大学毕业后面临的家庭催婚压力，以及如何应对这些问题。同时，他们也探讨了知识的力量，认为知识可以成为改变思维的工具。此外，他们还讨论了过年回家与家人的相处方式，以及如何在家庭和自我之间找到平衡。

**创业与学位的选择与思考**

这段内容讲述了讲者在创业期间，母亲对他的期望和看法。讲者认为，每一代人的价值观和观念都在不断变化，科技大厂的吸引力也在不断变化。讲者提到了技术对社会的影响，以及AI的最新动态。同时，讲者也分享了自己在技术领域的经历和感受。


**家庭环境对个人成长的影响**

这段内容主要讲述了讲者儿子的成长经历和家庭环境对他的影响。讲者的儿子即将参加高考，他的志愿和想法与上一辈有很大不同，讲者尊重儿子的选择，尽管有时不太认可。讲者的性格比较独立，不依赖家人，这种性格可能与他成长的家庭环境有关。


**家庭环境对自信的影响**

这段内容主要讲述了家庭环境对学生自信的影响。很多学生因为家庭关系，如父母的唠叨、贬低或打压，导致他们缺乏自信。这种不自信会影响到学生的各个方面，如找工作、职业发展、社交等。同时，这种不自信在贫困地区尤为严重。然而，也有一些家庭条件不好但乐观、充满自信的学生。与城市孩子相比，富裕家庭的孩子更容易保持自信，形成正向循环。因此，解决学生不自信的问题，需要家长、学校和社会共同努力。


**学生自信提升的实践与思考**

这段内容主要讲述了如何帮助学生走出自信陷阱。首先，学生需要意识到自己的问题，然后导师可以引导他们找到适合自己的方法。例如，通过在小组活动中带领他们，让他们逐渐适应面对观众的环境。此外，自我意识是最重要的，只有意识到问题，才能开始反思和行动。对于家庭中的孩子，家长可以通过语言诱导等方式帮助他们走出自信陷阱。总之，帮助学生走出自信陷阱需要因人而异，因家庭而异，但只要尝试，就能看到效果。


**启蒙教育与个人性格的适应性**

这段内容主要讲述了如何帮助那些不愿意接受新事物的人，例如黑白世界的居民。启蒙教育可以帮助他们意识到更广阔的世界，但需要因人而异。有些人可能需要慢慢引导，让他们在舒适区之外尝试新事物，如看电影、旅游等。同时，镜子也可以帮助他们看到自己的问题。总之，启蒙教育需要根据个人性格和需求进行，有时候需要从外部角度去观察和引导。


**个人成长与家庭关系的变化**

这段内容主要讲述了讲者自己的成长经历，以及如何通过加入远见组织、接受学姐的帮助，逐渐克服交流障碍，提升自信。同时，讲者也提到了自己在经济上与家庭联系的减少，以及对弟弟和表弟的期望。讲者认为，虽然自己无法改变他们的生活轨迹，但至少可以带他们出去看看外面的世界，让他们开始观察到不同的东西。


**寻找改变家庭的契机**

这段内容主要讲述了如何帮助弟弟找到改变自己的契机。讲者建议让弟弟去接触不同的环境，如成人与小孩一起的家庭，或者去实习单位观察同事之间的交往方式。同时，讲者也提到了单向街书店，这是一个由许知远等人创办的连锁书店，他们邀请很多名人文文学家、作家、哲学家、社会工讲者、老师分享他们的想法、经历和思想。讲者认为，启蒙教育非常重要，它能让一个人从迷茫、混沌的状态中思考，找到光明。大学教育的目的就是让学生意识到未来社会的黑暗和混沌，并给他们勇气去探索未来。


**大学教育的真正意义**

这段内容主要讲述了大学教育的本质和目的。大学教育应该让学生认识世界，启蒙他们的心智和勇气，而不是仅仅培养工具人。大学教育应该关注学生的内心成长、认知等方面，而不仅仅是技能和知识。同时，大学也应该为学生提供更多的实习机会，帮助他们更好地适应社会。讲者还提到了自己的学习经历，表示要努力提升自己，多留一条后路。


**挖掘自我潜力的关键因素**

这段内容主要讲述了人的潜力和自信的重要性。每个人的真实能力往往大于他们自己认为的能力，人的潜力是巨大的。要挖掘出这些潜力，需要一定的契机和勇气，以及坚韧不拔的精神。中国人从小到大经历了很多艰苦的事情，这种不屈不挠的精神是必要的。自信和信心是不同的，自信相对容易克服，而信心则是指相信自己能够发挥出更大的潜力。要相信自己能够达到更高的目标，才能动用所有的驱动力去实现它。


**个人成长与成功之路**

这段内容主要讲述了小时候对一些热血电影的印象，以及成功的人都是偏执狂的观点。同时，提到了读书会的一些安排，如限制分享时间，增加讨论环节等。最后，讲者还提到了与优秀的人靠拢的重要性，并分享了他们工作的主要原因。
`;

const summary2md = `
发言时长（分钟)：导师：39，学生：48

### 会议待办


* 抽三天时间完成论文，以便彻底放松并感受生活
* 下个月通话时询问技术问题


### 会议摘要


**工作面试与部门调动的困扰**

对话中，对方提到最近工作面试了七家公司，拿到了三个offer，其中一个部门的老板推荐他去另一个部门。目前还在等待另一个公司的春招结果。对方表示，虽然很喜欢现在的老板，但新部门的工作内容相同。关于公司文化，对方认为这个公司的文化氛围更偏向于去干成事情，效率快，节奏快。最后，对话中提到对方目前感到疲惫，希望继续讨论这方面的感受。


**合理安排工作与休息时间**

这段时间的任务基本完成，可以考虑休息和娱乐。可以选择吃喝玩乐，也可以选择做一些有意义的事情。例如，去旅游、回家、和女朋友出去玩等。在放松的同时，也可以获得新的收获。可以选择去从未去过的地方，体验完全不同的生活方式，了解当地的风土人情。还可以选择做志愿者、当老师、看林园等。总之，这段时间是难得的，可以尝试做一些不一样的事情，丰富自己的生活。


**创新学习社区与学生生活探索**

这段内容主要讲述了创新学习社区的一些活动，如美食鉴赏课、卡拉OK调查等，这些活动都很有意思。同时，也提到了学生们的忙碌程度，现在的学生比前两年的学生更忙，可能是因为经济不好，大家在学校里头参加各种活动的机会越来越多。此外，现在的学生们普遍追求考研考公的稳定性，但这种稳定性可能是虚假的，个人最应该看重的是不可替代性，有独特的价值在哪里。


**提升个人竞争力与生活琐事**

这段内容主要讲述了提高个人竞争力的重要性，建议大家不要一味地考研考公，而应该增强自己的竞争力。同时，分享了自己的工作经历，提到了AI相关的工作，以及与同事的沟通。此外，还提到了一对一导师的内容介绍，建议有兴趣的学生可以约他们聊一聊。最后，强调了现代人的孤独感，认为每个人都应该追求个人的发展、幸福和自由，以增强人与人之间的连接感。


**寻找归属感与自我提升的途径**

这段内容主要讲述了在现代社会中，人们普遍感到孤独和缺乏归属感。通过帮助他人，如导师与学生之间的互动，可以让人找到归属感。这种感觉不仅能治愈现代人的焦虑和疾病，还能让人回忆过去的经历，总结人生，让自己变得更好。此外，通过与其他导师和志愿者交流，可以互相学习，共同出谋划策，帮助学生和自己在职场中更好地调整心态和做事方法。


**共赢理念在职场中的应用**

主要讲述了在职场中如何处理合作与竞争的关系。讲者认为，应该把蛋糕做大，而不是争夺固定尺寸的蛋糕。在遇到矛盾时，要本着共赢、互相帮助的精神去理解对方，找到共同的解决方案。同时，要建立信念，抱着开放的心态去了解对方的想法，找到影响对方的方法。通过这样的方式，可以实现三方共赢，提高自己的影响力。


**非暴力沟通的实践与理解**

主要讲述了非暴力沟通的重要性，包括宏观层面如国家间、民族间的矛盾，以及微观层面如个人生活和工作中的应用。通过理解对方，找到解决问题的方法。同时，强调了在实践中不断磨练自己，克服内心的障碍，以达到更宏观、更包容的境界。每个人都有超越自我、包容的能力，但需要通过实践、感悟和修行来发掘和应用这些能力。


**团队协作与个人成长的祝福**

这段对话主要是在祝福对方顺利拿到offer，希望对方的新团队越来越好。同时，提到了对方的论文问题，希望尽早或尽可能晚地完成。最后，双方约定下个月12点再次见面。
`;

const menteeNote1 = `
【一对一】参与了刚刚的《灰色思考》读书分享会，感觉收获非常多。"看一本书就是多过了一生"感受很大。

回到家以后忽然有了反差，意识到家长对某亲戚的负面影响比较大，导致不自信、萎靡。聊了很多如何帮助对方走出压抑陷阱的话题。
`;

const menteeNote2 = `
【导师交流会】聊了职业规划与人际关系的困惑，对于自己未来的思考，博一，会主动询问导师的情况。 
目标有三个方向，教职，工作或者考公。聊完科研更合适，有共同的想法和方向。 第二次聊已经放下了考公，
专注其他两个方面。 生活的平衡上在努力，易焦虑，瑜伽缓解焦虑，建议找一个平衡的状态。 
聊了很多现在与未来的联接，科研内容，交换项目，未来选项，鼓励多看别的选择。
`;

const demoData = {
  users,
  summaries: [{
    md: summary1md,
    startedAt: moment('2025-5-12', 'YYYY-MM-DD').valueOf(),
    endedAt: moment('2025-5-12', 'YYYY-MM-DD').add(56, 'minute').valueOf(),
  },
  {
    md: summary2md,
    startedAt: moment('2025-6-1', 'YYYY-MM-DD').valueOf(),
    endedAt: moment('2025-6-1', 'YYYY-MM-DD').add(92, 'minute').valueOf(),
  }],
  menteeNotes: [
    menteeNote1,
    menteeNote2,
  ],
  calibration: {
    name: '2025届面试组',
    interviews: [
      {
        interviewee: users.mentee4,
        interviewers: [users.admin, users.mentor4],
      },
      {
        interviewee: users.mentee5,
        interviewers: [users.mentor1, users.mentor5],
      },
    ],
  },
} as const;

export default demoData;
