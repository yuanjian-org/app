import { procedure, router } from "../trpc";
import db from "../database/db";
import {
  interviewFeedbackAttributes, mentorSelectionBatchAttributes, mentorSelectionBatchInclude, minUserAttributes
} from "api/database/models/attributesAndIncludes";
import { compareChinese, formatUserName } from "shared/strings";
import { MenteeStatus } from "shared/MenteeStatus";
import { Feedback } from "shared/InterviewFeedback";
import { authUser } from "../auth";
import {
  menteeAcceptanceYearField,
  menteeCollegeField,
  menteeDegreeField,
  menteeFirstYearInCollegeField,
  menteeMajorField,
  menteeExpectationField,
} from "shared/applicationFields";
import { whereMentorshipIsOngoing } from "./mentorships";
import { MinUser } from "shared/User";
import { loadGoogleSpreadsheet, SpreadsheetInputData } from "api/gsheets";
import { updateGoogleSpreadsheet } from "api/gsheets";
import { Op } from "sequelize";
import { MentorSelectionBatch } from "shared/MentorSelection";
import moment from "moment";
import { UserProfile } from "shared/UserProfile";
import {
  menteeInterviewDimensions,
  mentorInterviewDimensions
} from "shared/interviewDimentions";
import { InterviewType } from "shared/InterviewType";
import { listMentors, ListMentorsOutput } from "./users";
import invariant from "shared/invariant";
import { computeTraitsMatchingScore, hardMismatchScore, TraitsPreference } from "shared/Traits";
import Role from "shared/Role";
import { z } from "zod";

// Must be the same as BANNED_SCORE in 
// https://github.com/yuanjian-org/ops/blob/main/matchmaker/match.ipynb
const bannedScore = -10;

// Because servers in China has no access to Google APIs, we have to run the 
// Spreadsheet export on a dev server.
const baseUrl = "https://mentors.org.cn";

const exportInitialMatchData = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    documentId: z.string(),
  }))
  .mutation(async ({ input: { documentId } }) =>
{
  const mentees = await listEligibleMentees();
  const batches = await listMentorSelectionBatches(mentees);
  const apps = await listMenteeApplications(mentees);
  const profiles = await listMenteeProfiles(mentees);
  const menteeFnDs = await listInterviewFeedbackAndDecisions(
    "MenteeInterview", mentees.map(m => m.id));
  const mentors = (await listMentors()).filter(m => m.relational);
  const mentorFnDs = await listInterviewFeedbackAndDecisions(
    "MentorInterview", mentors.map(m => m.user.id));
  const mentorCoacheIds = await listMentorCoacheIds();

  const data: SpreadsheetInputData = [];
  data.push(formatInstructionsWorksheet(mentees, batches));

  for (const mentee of mentees) {
    data.push(formatMenteeWorksheet(
      mentee, 
      batches[mentee.id], 
      apps[mentee.id],
      profiles[mentee.id], 
      menteeFnDs[mentee.id],
      mentors,
      mentorFnDs,
      mentorCoacheIds,
    ));
  }

  const doc = await loadGoogleSpreadsheet(documentId,
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL!,
    process.env.GOOGLE_SHEETS_PRIVATE_KEY!);
  await updateGoogleSpreadsheet(doc, data);
});

function colHeader(value: any, editable?: boolean) {
  return {
    value,
    textFormat: {
      bold: true,
      ...editable && { foregroundColor: { red: 0x7f / 0xff } },
    }
  };
}

function formatInstructionsWorksheet(
  mentees: MinUser[], batches: Record<string, MentorSelectionBatch>
) {
  // Stablize the order
  const sorted = mentees.sort((a, b) => compareChinese(a.name, b.name));

  return {
    title: '【使用说明】',
    cells: [
      ['【使用说明】'],
      ['除红色粗体的columns之外，请勿更新任何其他数据。它们会被自动重置。'],
      // ['2. 在完成每位学生的匹配度打分后，请更新本页下面的 “已完成” 列。'],
      [],
      [],
      [
        colHeader('学生姓名'),
        colHeader('偏好提交时间'),
        // colHeader('匹配负责人', true),
        // colHeader('已完成', true),
      ],
      ...sorted.map(m => [
        formatUserName(m.name),
        !batches[m.id] ?
          "无" :
          batches[m.id].finalizedAt ?
            moment(batches[m.id].finalizedAt).format("YYYY-MM-DD") :
            "草稿",
      ]),
    ]
  };
}

function hyperlink(url: string, str: string) {
  return `=HYPERLINK("${url}", "${str}")`;
}

function getInterviewData(
  dimensions: string[], 
  fnd: FeedbackAndDecision | null
) {
  const feedbackScores = getInterviewDimensionalScores(
    dimensions, fnd?.feedbacks);
  // Assume there is only one dimension which is "总评"
  const decisinoScore = fnd?.decision?.dimensions?.[0]?.score ?? null;
  const decisionComment = fnd?.decision?.dimensions?.[0]?.comment ?? null;
  return { feedbackScores, decisinoScore, decisionComment };
}

function getInterviewDimensionalScores(
  dimensions: string[], feedbacks: Feedback[] | undefined
): (number | null)[] {
  const scores: (number | null)[] = [];
  for (const dname of dimensions) {
    let cnt = 0, sum = 0;
    for (const f of feedbacks ?? []) {
      const dimensions = f.dimensions;
      if (!dimensions) continue;
      for (const d of dimensions) {
        if (d.name == dname && d.score) {
          cnt++;
          sum += d.score;
        }
      }
    }
    scores.push(cnt ? sum / cnt : null);
  }
  return scores;
}

function formatMenteeWorksheet(
  mentee: MinUser,
  batch: MentorSelectionBatch | null,
  app: Record<string, any> | null,
  profile: UserProfile | null,
  menteeFnD: FeedbackAndDecision | null,
  mentors: ListMentorsOutput,
  mentorFnDs: Record<string, FeedbackAndDecision>,
  mentorCoacheIds: string[]
)
{
  invariant(!batch || batch.userId === mentee.id, "Mentor & batch mismatch");

  const id2mentor = mentors.reduce((acc, m) => {
    acc[m.user.id] = m;
    return acc;
  }, {} as Record<string, ListMentorsOutput[number]>);

  const name = formatUserName(mentee.name);
  const bioCell = [
    ...profile ? [profile.性别] : [],
    ...app ? [app[menteeCollegeField]] : [],
    ...app ? [app[menteeMajorField]] : [],
    ...app ? [app[menteeDegreeField]] : [],
    ...app ? [`${app[menteeFirstYearInCollegeField]}年大一入学`] : [],
    ...app ? [`${app[menteeAcceptanceYearField]}届录取`] : [],
  ].join("，");

  const { feedbackScores, decisinoScore, decisionComment } = getInterviewData(
    menteeInterviewDimensions, menteeFnD);

  const nameCell = { 
    value: hyperlink(baseUrl + "/mentees/" + mentee.id, name),
    bold: true 
  };

  const menteePreferenceTableHeaderRow = [
    '最终匹配度',
    {
      value: '学生偏好度',
      note: "根据学生偏好顺序，从10到2依次递减",
    },
    '学生偏好原因', 
    {
      ...colHeader(`敏感：${bannedScore}并终止`, true),
      note: '学生与导师行业相似，并属于以下敏感行业：AI、大数据、量子计算、芯片半导体、生物、能源、航空航天',
    },
    {
      ...colHeader('偏专：-2', true),
      note: '学生偏好原因和导师专业领域有关',
    },
    {
      ...colHeader('互补：每项+2', true),
      note: '导师在学生面试的低分项上恰是高分项',
    },
    {
      ...colHeader('关注：每项+2', true),
      note: '导师在在学生面试总评中需关注的方面有特长',
    },
    {
      ...colHeader('个性：每项+2', true),
      note: '导师在学生个性方面有特长。比如有心理学背景的导师适合情绪敏感的学生，循循善诱分数高的导师适合思维能力较弱的学生，忘年之交分数高的导师适合低年纪学生等',
    },
    {
      ...colHeader('偏好：每项+2', true),
      note: '学生符合在“导师偏好文字”中描述的特质',
    },
    {
      ...colHeader('期待：每项+1', true),
      note: '导师在学生对远见的期待方面有特长',
    },
    colHeader('备注', true),
    '导师', 
    '性别',
    '导师偏好文字', 
    '职务',
    '爱好',
    '',
    '面试总评', 
    ...mentorInterviewDimensions,
  ];

  const preferredMentors = (batch?.selections ?? [])
    .sort((a, b) => a.order - b.order)
    .map(s => ({
      user: id2mentor[s.mentor.id].user,
      profile: id2mentor[s.mentor.id].profile,
      pref: id2mentor[s.mentor.id].traitsPreference,
      fnd: mentorFnDs[s.mentor.id],
      isMentorCoach: mentorCoacheIds.includes(s.mentor.id),
      order: s.order,
      reason: s.reason,
      // UI doesn't allow mentees to select hard mismatching mentors at all
      hardMismatch: false,
    }));

  const otherMentors = mentors
    .filter(m => m.relational)
    .filter(m => !preferredMentors.some(pm => pm.user.id === m.user.id))
    // Sort stably so mentor positions don't change between synces
    .sort((a, b) => compareChinese(a.user.name, b.user.name))
    .map(m => ({
      user: m.user,
      profile: m.profile,
      pref: m.traitsPreference,
      fnd: mentorFnDs[m.user.id],
      isMentorCoach: mentorCoacheIds.includes(m.user.id),
      order: null,
      reason: null,
      hardMismatch: !profile ? false : computeTraitsMatchingScore(
        profile,
        app,
        m.traitsPreference,
      ).score === hardMismatchScore,
    }));

  const 姓名行 = [nameCell, bioCell];
  const 总评行 = [null, "面试总评", ...menteeInterviewDimensions];
  const 维度打分行 = ['维度打分', decisinoScore, ...formatInterviewScores(feedbackScores)];
  const mentorRowStart = 12;
  
  const 匹配负责人行 = [null, null, null, 
    "Canoee", "Canoee", "Weihan", "Xichang", "Xichang", "Yixin", "Yixin",
  ];

  return {
    title: name,
    cells: [
      [...姓名行, ...Array(14).fill(null), ...姓名行],
      [],
      [...总评行, ...Array(6).fill(null), ...总评行],
      [...维度打分行, ...Array(6).fill(null), ...维度打分行],
      [],
      ['面试总评', decisionComment?.trim()],
      [],
      ['学生期待', app?.[menteeExpectationField]?.trim()],
      [],
      匹配负责人行,
      menteePreferenceTableHeaderRow,
      ...preferredMentors.map((m, i) =>
        formatMentorRow(i + mentorRowStart, m)),
      ...otherMentors.map((m, i) =>
        formatMentorRow(i + mentorRowStart + preferredMentors.length, m)),
    ],
  };
}

function order2matchingScore(order: number | null): number {
  return order === null ? 0 : Math.max(10 - order, 2);
}

function formatMentorRow(row: number, {
  user, profile, pref, fnd, isMentorCoach, order, reason, hardMismatch
}: {
  user: MinUser,
  profile: UserProfile,
  pref: TraitsPreference | null,
  fnd: FeedbackAndDecision | null,
  isMentorCoach: boolean,
  // null if the mentor is not in the preference list
  order: number | null, 
  hardMismatch: boolean | null,
  reason: string | null,
}) {
  const matchingScore = `=IF(D${row}=${bannedScore}, ${bannedScore}, ` +
    `B${row}+E${row}+F${row}+G${row}+H${row}+I${row}+J${row})`;

  const { feedbackScores, decisionComment } = getInterviewData(
    mentorInterviewDimensions, fnd);

  const cell = hardMismatch ? "n/a" : null;
  return [
    // 最终匹配度
    hardMismatch ? bannedScore : matchingScore,
    // 学生偏好度
    order2matchingScore(order),
    // 学生偏好原因
    hardMismatch ? "不满足硬性特质偏好" : reason,
    // 匹配打分
    ...Array(7).fill(cell),
    // 匹配备注
    cell,
    // 姓名
    hyperlink(
      baseUrl + "/users/" + user.id,
      formatUserName(user.name)),
    // 性别
    profile.性别,
    // 偏好文字
    flatten(pref?.其他),
    // 职务
    flatten(profile.身份头衔),
    // 爱好
    flatten(profile.爱好与特长),
    // 间隔列. Use non-null content to cut off text from previous column.
    " ",
    // 面试总评
    isMentorCoach ? "【资深导师】" : flatten(decisionComment),
    ...isMentorCoach ? [] : formatInterviewScores(feedbackScores),
  ];
}

/**
 * There isn't an easy way to control row height using the google-spreadsheet 
 * API. So when there are multiple lines in a cell, row heights will become
 * ugly uneven.
 * 
 * This function flattens multi-line text into a single line.
 */
function flatten(str: string | undefined | null) {
  return str?.split('\n').filter(line => line.trim()).join(' // ');
}

function formatInterviewScores(scores: (number | null)[]) {
  const highlight = {
    backgroundColor: { red: 0xff / 0xff, green: 0xf2 / 0xff, blue: 0xcc / 0xff }
    // backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
  };
  const noHighlight = {
    backgroundColor: { red: 1, green: 1, blue: 1 }
  };
  return scores.map(s => s == null ? null : { 
    value: s, 
    ...s >= 3.5 ? noHighlight : highlight 
  });
}

/**
 * Eligible mentees are those who are in the "现届学子" status and have no 
 * ongoing relational mentorship.
 */
async function listEligibleMentees(): Promise<MinUser[]> {
  const menteeStatus: MenteeStatus = "现届学子";
  const all = await db.User.findAll({
    where: { menteeStatus },
    attributes: minUserAttributes,
  });
  
  const relational = await db.Mentorship.findAll({
    where: {
      transactional: false,
      ...whereMentorshipIsOngoing,
    },
    attributes: ["menteeId"],
  });

  return all.filter(m => !relational.some(r => r.menteeId == m.id));
}

/**
 * @returns a map from userId to mentor selection batch.
 */
async function listMentorSelectionBatches(mentees: MinUser[]): 
  Promise<Record<string, MentorSelectionBatch>> 
{
  const batches = await db.MentorSelectionBatch.findAll({
    where: {
      userId: { [Op.in]: mentees.map(m => m.id) },
    },
    attributes: mentorSelectionBatchAttributes,
    include: mentorSelectionBatchInclude,
  });

  return batches.reduce((acc, b) => {
    acc[b.userId] = b;
    return acc;
  }, {} as Record<string, MentorSelectionBatch>);
}

/**
 * @returns a map from userId to mentee application.
 */
async function listMenteeApplications(mentees: MinUser[]): 
  Promise<Record<string, Record<string, any> | null>>
{
  const apps = await db.User.findAll({
    where: { id: { [Op.in]: mentees.map(m => m.id) } },
    attributes: ["id", "menteeApplication"],
  });
  return apps.reduce((acc, a) => {
    acc[a.id] = a.menteeApplication;
    return acc;
  }, {} as Record<string, Record<string, any> | null>);
}

/**
 * @returns a map from userId to mentee application.
 */
async function listMenteeProfiles(mentees: MinUser[]): 
  Promise<Record<string, UserProfile>>
{
  const apps = await db.User.findAll({
    where: { id: { [Op.in]: mentees.map(m => m.id) } },
    attributes: ["id", "profile"],
  });
  return apps.reduce((acc, a) => {
    acc[a.id] = a.profile ?? {};
    return acc;
  }, {} as Record<string, UserProfile>);
}

async function listMentorCoacheIds(): Promise<string[]> {
  // Force type check
  const coachRole: Role = "MentorCoach";
  return (await db.User.findAll({
    where: { roles: { [Op.contains]: [coachRole] } },
    attributes: ["id"],
  })).map(c => c.id);
}

type FeedbackAndDecision = {
  feedbacks: Feedback[];
  decision: Feedback;
}
/**
 * @returns a map from userId to FeedbackAndDecision.
 * 
 * Note that we assume one interview per mentee. When there are more than one,
 * we take an arbitrary one.
 */
async function listInterviewFeedbackAndDecisions(
  type: InterviewType, interviewerIds: string[]
): Promise<Record<string, FeedbackAndDecision>> {
  const interviews = await db.Interview.findAll({
    where: { 
      type,
      intervieweeId: { [Op.in]: interviewerIds },
    },
    attributes: ["intervieweeId", "decision"],
    include: {
      association: "feedbacks",
      attributes: interviewFeedbackAttributes,
    }
  });

  return interviews.reduce((acc, i) => {
    acc[i.intervieweeId] = {
      decision: i.decision as Feedback,
      feedbacks: i.feedbacks.filter(f => f.feedback)
        .map(f => f.feedback as Feedback),
    };
    return acc;
  }, {} as Record<string, FeedbackAndDecision>);
}

export default router({
  exportInitialMatchData,
});
