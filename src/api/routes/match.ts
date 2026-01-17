/**
 * @fileoverview There are two stages of the matching process: 初配 and 定配.
 *
 * All the functions starting with "initial" or "initialMatch" are for the 1st
 * stage. All the functions starting with "final" or "finalMatch" are for the
 * 2nd stage.
 */

import { procedure, router } from "../trpc";
import db from "../database/db";
import {
  interviewFeedbackAttributes,
  mentorSelectionBatchAttributes,
  mentorSelectionBatchInclude,
  minUserAttributes,
} from "api/database/models/attributesAndIncludes";
import {
  compareChinese,
  compareDate,
  compareUUID,
  formatUserName,
} from "shared/strings";
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
  menteeSourceField,
} from "shared/applicationFields";
import {
  createMentorship,
  updateMentorship,
  whereMentorshipIsOngoing,
} from "./mentorships";
import { MinUser } from "shared/User";
import { defaultMentorCapacity } from "shared/UserPreference";
import { loadGoogleSpreadsheet, SpreadsheetInputData } from "api/gsheets";
import { updateGoogleSpreadsheet } from "api/gsheets";
import { Op, Transaction } from "sequelize";
import { MentorSelectionBatch } from "shared/MentorSelection";
import moment from "moment";
import { UserProfile } from "shared/UserProfile";
import {
  menteeInterviewDimensions,
  mentorInterviewDimensions,
} from "shared/interviewDimentions";
import { InterviewType } from "shared/InterviewType";
import {
  listMentorsImpl,
  ListMentorsOutput,
  listMentorStatsImpl,
} from "./users";
import invariant from "shared/invariant";
import {
  computeTraitsMatchingScore,
  hardMismatchScore,
  TraitsPreference,
} from "shared/Traits";
import { z } from "zod";
import sequelize from "api/database/sequelize";
import { generalBadRequestError, notFoundError } from "api/errors";
import { newTransactionalMentorshipEndsAt } from "shared/Mentorship";
import {
  CsvFormats,
  FinalMatchSolution,
  InitialMatchSolution,
  zCsvFormats,
  zFinalMatchSolution,
  zInitialMatchSolution,
} from "shared/match";
import {
  MenteeMatchFeedback,
  MentorMatchFeedback,
  MentorMatchFeedbackChoice,
} from "shared/MatchFeedback";
import { getLastMatchFeedback } from "./matchFeedback";

// Must be the same as BANNED_SCORE in tools/match.ipynb
const bannedScore = -10;

// Because servers in China has no access to Google APIs, we have to run the
// Spreadsheet export on a dev server.
const baseUrl = "https://mentors.org.cn";

// Export spreadsheet for initial match
const exportInitialSpreadsheet = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      documentId: z.string(),
    }),
  )
  .mutation(async ({ input: { documentId } }) => {
    const mentees = await listEligibleMentees();
    const batches = await sequelize.transaction(
      async (transaction) =>
        await listMentorSelectionBatches(
          mentees.map((m) => m.id),
          transaction,
        ),
    );
    const apps = await listMenteeApplications(mentees);
    const profiles = await listMenteeProfiles(mentees);
    const menteeFnDs = await listInterviewFeedbackAndDecisions(
      "MenteeInterview",
      mentees.map((m) => m.id),
    );
    const mentors = await listEligibleMentors();
    const mentorFnDs = await listInterviewFeedbackAndDecisions(
      "MentorInterview",
      mentors.map((m) => m.user.id),
    );

    const data: SpreadsheetInputData = [];
    data.push(formatInstructionsWorksheet(mentees, batches));

    for (const mentee of mentees) {
      data.push(
        formatMenteeWorksheet(
          mentee,
          batches[mentee.id],
          apps[mentee.id],
          profiles[mentee.id],
          menteeFnDs[mentee.id],
          mentors,
          mentorFnDs,
        ),
      );
    }

    const doc = await loadGoogleSpreadsheet(documentId);
    await updateGoogleSpreadsheet(doc, data);
  });

function colHeader(value: any, editable?: boolean) {
  return {
    value,
    textFormat: {
      bold: true,
      ...(editable && { foregroundColor: { red: 0x7f / 0xff } }),
    },
  };
}

function formatInstructionsWorksheet(
  mentees: MinUser[],
  batches: Record<string, MentorSelectionBatch>,
) {
  // Stablize the order
  const sorted = mentees.sort((a, b) => compareChinese(a.name, b.name));

  return {
    title: "【使用说明】",
    cells: [
      ["【使用说明】"],
      ["除红色粗体的columns之外，请勿更新任何其他数据。它们会被自动重置。"],
      // ['2. 在完成每位学生的匹配度打分后，请更新本页下面的 “已完成” 列。'],
      [],
      [],
      [
        colHeader("学生姓名"),
        colHeader("偏好提交时间"),
        // colHeader('匹配负责人', true),
        // colHeader('已完成', true),
      ],
      ...sorted.map((m) => {
        const f = batches[m.id]?.finalizedAt;
        return [
          formatUserName(m.name),
          !batches[m.id]
            ? "无"
            : f
              ? {
                  value: moment(f).format("YYYY-MM-DD"),
                  textFormat: {
                    foregroundColor: {
                      red: moment().diff(moment(f), "days") > 30 ? 1 : 0,
                    },
                  },
                }
              : "草稿",
        ];
      }),
    ],
  };
}

function hyperlink(url: string, str: string) {
  return `=HYPERLINK("${url}", "${str}")`;
}

function menteeHyperlink(mentee: MinUser) {
  return hyperlink(
    baseUrl + "/mentees/" + mentee.id,
    formatUserName(mentee.name),
  );
}

function mentorHyperlink(mentor: MinUser) {
  return hyperlink(
    baseUrl + "/users/" + mentor.id,
    formatUserName(mentor.name),
  );
}

/**
 * This function assumes that the links are in the form of ".../<uuid>"
 */
function hyperlink2userId(hyperlink: string | undefined): string {
  invariant(hyperlink, "Hyperlink is undefined");
  const uuid = hyperlink.split("/").pop();
  invariant(uuid, "UUID is undefined");
  return uuid;
}

function getInterviewData(
  dimensions: string[],
  fnd: FeedbackAndDecision | null,
) {
  const feedbackScores = getInterviewDimensionalScores(
    dimensions,
    fnd?.feedbacks,
  );
  // Assume there is only one dimension which is "总评"
  const decisinoScore = fnd?.decision?.dimensions?.[0]?.score ?? null;
  const decisionComment = fnd?.decision?.dimensions?.[0]?.comment ?? null;
  return { feedbackScores, decisinoScore, decisionComment };
}

function getInterviewDimensionalScores(
  dimensions: string[],
  feedbacks: Feedback[] | undefined,
): (number | null)[] {
  const scores: (number | null)[] = [];
  for (const dname of dimensions) {
    let cnt = 0,
      sum = 0;
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

const ignoreLabel = "学生尚未完整提交偏好，请暂时忽略该生";

function formatMenteeWorksheet(
  mentee: MinUser,
  batch: MentorSelectionBatch | null,
  app: Record<string, any> | null,
  profile: UserProfile | null,
  menteeFnD: FeedbackAndDecision | null,
  mentors: ListMentorsOutput,
  mentorFnDs: Record<string, FeedbackAndDecision>,
) {
  invariant(!batch || batch.userId === mentee.id, "Mentor & batch mismatch");

  const id2mentor = mentors.reduce(
    (acc, m) => {
      acc[m.user.id] = m;
      return acc;
    },
    {} as Record<string, ListMentorsOutput[number]>,
  );

  const name = formatUserName(mentee.name);
  const bioCell = [
    ...(profile ? [profile.性别] : []),
    ...(app ? [app[menteeCollegeField]] : []),
    ...(app ? [app[menteeMajorField]] : []),
    ...(app ? [app[menteeDegreeField]] : []),
    ...(app ? [`${app[menteeFirstYearInCollegeField]}年大一入学`] : []),
    ...(app ? [`${app[menteeAcceptanceYearField]}届录取`] : []),
  ].join("，");

  const { feedbackScores, decisinoScore, decisionComment } = getInterviewData(
    menteeInterviewDimensions,
    menteeFnD,
  );

  const nameCell = {
    value: menteeHyperlink(mentee),
    bold: true,
  };

  const menteePreferenceTableHeaderRow = [
    "最终匹配度",
    {
      value: "学生偏好度",
      note: "根据学生偏好的顺序递减",
    },
    "学生偏好原因",
    {
      ...colHeader(`特殊情况`, true),
      note:
        `情况A，设成“${bannedScore}”：学生与导师行业相似，并属于以下敏感行业：AI、大数据、量子计算、芯片半导体、生物、能源、航空航天` +
        `\n\n` +
        `情况B，设成“学生匹配度”的负数：“学生偏好原因”是导师的外貌`,
    },
    {
      ...colHeader("偏专：-9或-5", true),
      note: "“学生偏好原因”和职业技能辅导或导师专业领域有关，这些话题应通过不定期导师实现\n\n减9分，确保该导师排在其他学生选择的导师之后\n\n减5分，如果学生例举了选择该导师的其他原因",
    },
    {
      ...colHeader("互补：各+2", true),
      note: "导师在学生面试“维度打分”的低分项上恰是高分项\n\n每项加1或2分",
    },
    {
      ...colHeader("关注：各+2", true),
      note: "导师在在学生“面试总评”中需导师关注的方面有特长\n\n每项加1或2分",
    },
    {
      ...colHeader("个性：各+2", true),
      note: "导师在学生个性方面有特长。比如有心理学背景的导师适合情绪敏感的学生，循循善诱分数高的导师适合思维能力较弱的学生，忘年之交分数高的导师适合低年纪学生等\n\n每项加1或2分",
    },
    {
      ...colHeader("偏好：+千或各+2", true),
      note: "学生符合在“导师偏好文字”中描述的特质\n\n每项加1或2分\n\n+1000分，如果导师特别指定了学生的姓名。确保该导师排在所有其他导师之前",
    },
    {
      ...colHeader("期待：各+2", true),
      note: "导师在“学生期待”的领域有特长，请注意⚠️：忽略与职业相关的期待\n\n每项加1或2分",
    },
    colHeader("备注", true),
    "导师",
    "性别",
    "导师偏好文字",
    "职务",
    "爱好",
    "",
    "面试总评",
    ...mentorInterviewDimensions,
  ];

  const preferredMentors = (batch?.selections ?? [])
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      if (!id2mentor[s.mentor.id]) {
        console.error(
          `${mentee.name}：导师${s.mentor.name}不在可匹配导师列表，可能因为导师状态在学生选择后被更新`,
        );
        return null;
      } else {
        return {
          user: id2mentor[s.mentor.id].user,
          profile: id2mentor[s.mentor.id].profile,
          pref: id2mentor[s.mentor.id].traitsPreference,
          fnd: mentorFnDs[s.mentor.id],
          order: s.order,
          reason: s.reason,
          // UI doesn't allow mentees to select hard mismatching mentors at all
          hardMismatch: false,
        };
      }
    })
    .filter((m) => m !== null);

  const otherMentors = mentors
    .filter((m) => m.relational)
    .filter((m) => !preferredMentors.some((pm) => pm.user.id === m.user.id))
    // Sort stably so mentor positions don't change between synces
    .sort((a, b) => compareChinese(a.user.name, b.user.name))
    .map((m) => ({
      user: m.user,
      profile: m.profile,
      pref: m.traitsPreference,
      fnd: mentorFnDs[m.user.id],
      order: null,
      reason: null,
      hardMismatch: !profile
        ? false
        : computeTraitsMatchingScore(profile, app, m.traitsPreference).score ===
          hardMismatchScore,
    }));

  const 姓名行 = [nameCell, bioCell];
  const 总评行 = [null, "面试总评", ...menteeInterviewDimensions];
  const 维度打分行 = [
    "维度打分",
    decisinoScore,
    ...formatInterviewScores(feedbackScores),
  ];
  const mentorRowStart = 12;

  const 匹配负责人行 = [
    null,
    null,
    null,
    ...(batch?.finalizedAt
      ? [
          // Reset formatting of the ignoreLabel
          {
            value: "Canoee",
            textFormat: {
              foregroundColor: { red: 0, green: 0, blue: 0 },
              bold: false,
            },
          },
          "Canoee",
          "Weihan",
          "Xichang",
          "Xichang",
          "Yixin",
          "Yixin",
        ]
      : [
          {
            value: ignoreLabel,
            textFormat: {
              foregroundColor: { red: 1 },
              bold: true,
            },
          },
        ]),
  ];

  return {
    title: name,
    cells: [
      [...姓名行, ...Array(14).fill(null), ...姓名行],
      [],
      [...总评行, ...Array(6).fill(null), ...总评行],
      [...维度打分行, ...Array(6).fill(null), ...维度打分行],
      [],
      ["面试总评", decisionComment?.trim()],
      [],
      ["学生期待", app?.[menteeExpectationField]?.trim()],
      [],
      匹配负责人行,
      menteePreferenceTableHeaderRow,
      ...preferredMentors.map((m, i) => formatMentorRow(i + mentorRowStart, m)),
      ...otherMentors.map((m, i) =>
        formatMentorRow(i + mentorRowStart + preferredMentors.length, m),
      ),
    ],
  };
}

function order2matchingScore(order: number | null): number {
  return order === null ? 0 : Math.max(100 - order, 2);
}

function formatMentorRow(
  row: number,
  {
    user,
    profile,
    pref,
    fnd,
    order,
    reason,
    hardMismatch,
  }: {
    user: MinUser;
    profile: UserProfile;
    pref: TraitsPreference | null;
    fnd: FeedbackAndDecision | null;
    // null if the mentor is not in the preference list
    order: number | null;
    hardMismatch: boolean | null;
    reason: string | null;
  },
) {
  const matchingScore =
    `=IF(D${row}=${bannedScore}, ${bannedScore}, ` +
    `B${row}+D${row}+E${row}+F${row}+G${row}+H${row}+I${row}+J${row})`;

  const { feedbackScores, decisionComment } = getInterviewData(
    mentorInterviewDimensions,
    fnd,
  );

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
    mentorHyperlink(user),
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
    flatten(decisionComment),
    ...formatInterviewScores(feedbackScores),
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
  return str
    ?.split("\n")
    .filter((line) => line.trim())
    .join(" // ");
}

function formatInterviewScores(scores: (number | null)[]) {
  const highlight = {
    backgroundColor: {
      red: 0xff / 0xff,
      green: 0xf2 / 0xff,
      blue: 0xcc / 0xff,
    },
    // backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
  };
  const noHighlight = {
    backgroundColor: { red: 1, green: 1, blue: 1 },
  };
  return scores.map((s) =>
    s == null
      ? null
      : {
          value: s,
          ...(s >= 3.5 ? noHighlight : highlight),
        },
  );
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

  return all.filter((m) => !relational.some((r) => r.menteeId == m.id));
}

async function listEligibleMentors(): Promise<ListMentorsOutput> {
  return (await listMentorsImpl()).filter((m) => m.relational);
}

/**
 * @returns a map from userId to mentor selection batch.
 */
async function listMentorSelectionBatches(
  menteeIds: string[],
  transaction: Transaction,
): Promise<Record<string, MentorSelectionBatch>> {
  const batches = await db.MentorSelectionBatch.findAll({
    where: {
      userId: { [Op.in]: menteeIds },
    },
    attributes: mentorSelectionBatchAttributes,
    include: mentorSelectionBatchInclude,
    transaction,
  });

  return batches.reduce(
    (acc, b) => {
      if (b.userId in acc) {
        // Select the last batch.
        acc[b.userId] =
          compareDate(b.finalizedAt, acc[b.userId].finalizedAt) > 0
            ? b
            : acc[b.userId];
      } else {
        acc[b.userId] = b;
      }
      return acc;
    },
    {} as Record<string, MentorSelectionBatch>,
  );
}

/**
 * @returns a map from userId to mentee application.
 */
async function listMenteeApplications(
  mentees: MinUser[],
): Promise<Record<string, Record<string, any> | null>> {
  const apps = await db.User.findAll({
    where: { id: { [Op.in]: mentees.map((m) => m.id) } },
    attributes: ["id", "menteeApplication"],
  });
  return apps.reduce(
    (acc, a) => {
      acc[a.id] = a.menteeApplication;
      return acc;
    },
    {} as Record<string, Record<string, any> | null>,
  );
}

/**
 * @returns a map from userId to mentee application.
 */
async function listMenteeProfiles(
  mentees: MinUser[],
): Promise<Record<string, UserProfile>> {
  const apps = await db.User.findAll({
    where: { id: { [Op.in]: mentees.map((m) => m.id) } },
    attributes: ["id", "profile"],
  });
  return apps.reduce(
    (acc, a) => {
      acc[a.id] = a.profile ?? {};
      return acc;
    },
    {} as Record<string, UserProfile>,
  );
}

type FeedbackAndDecision = {
  feedbacks: Feedback[];
  decision: Feedback;
};

/**
 * @returns a map from userId to FeedbackAndDecision.
 *
 * Note that we assume one interview per mentee. When there are more than one,
 * we take an arbitrary one.
 */
async function listInterviewFeedbackAndDecisions(
  type: InterviewType,
  interviewerIds: string[],
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
    },
  });

  return interviews.reduce(
    (acc, i) => {
      acc[i.intervieweeId] = {
        decision: i.decision as Feedback,
        feedbacks: i.feedbacks
          .filter((f) => f.feedback)
          .map((f) => f.feedback as Feedback),
      };
      return acc;
    },
    {} as Record<string, FeedbackAndDecision>,
  );
}

/**
 * Generate input CSVs for the initial match solver.
 */
const generateInitialSolverInput = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      documentId: z.string(),
    }),
  )
  .output(
    z.object({
      capacities: zCsvFormats,
      scores: zCsvFormats,
    }),
  )
  .query(async ({ input: { documentId } }) => {
    return {
      capacities: await generateMentorCapacitiesCSV(),
      scores: await generateInitialScoresCSV(documentId),
    };
  });

const generateFinalSolverInput = procedure
  .use(authUser("MentorshipManager"))
  .output(
    z.object({
      capacities: zCsvFormats,
      scores: zCsvFormats,
    }),
  )
  .query(async () => {
    return {
      capacities: await generateMentorCapacitiesCSV(),
      scores: await generateFinalScoresCSV(),
    };
  });

async function listMentorCapacities(): Promise<Record<string, number>> {
  const stats = await listMentorStatsImpl();
  return stats.reduce(
    (acc, m) => {
      acc[m.user.id] = Math.max(
        0,
        (m.preference.最多匹配学生 ?? defaultMentorCapacity) - m.mentorships,
      );
      return acc;
    },
    {} as Record<string, number>,
  );
}

async function generateMentorCapacitiesCSV(): Promise<CsvFormats> {
  const ids: string[] = [];
  const names: string[] = [];
  for (const [id, cap] of Object.entries(await listMentorCapacities())) {
    ids.push(`${id},${cap}`);
    names.push(`${formatUserName(await getUserName(id))},${cap}`);
  }

  // Must match the format in tools/match.ipynb
  const header = "导师,学生容量";

  return {
    ids: [header, ...ids].join("\n"),
    names: [header, ...names].join("\n"),
  };
}

async function generateInitialScoresCSV(docId: string): Promise<CsvFormats> {
  const doc = await loadGoogleSpreadsheet(docId);

  // A two-level map of mentee-id => mentor-id => score
  const mentee2map: Record<string, Record<string, number>> = {};
  for (const sheet of doc.sheetsByIndex) {
    console.log("Reading sheet", sheet.title);
    await sheet.loadCells();
    const mentorRowIndex = 10;
    const mentorColIndex = 11;
    if (sheet.getCell(mentorRowIndex, mentorColIndex).value != "导师") continue;

    if (sheet.getCell(9, 3).value == ignoreLabel) {
      console.log("Ignoring mentee with no mentor selection", sheet.title);
      continue;
    }

    const mentor2score: Record<string, number> = {};
    for (let r = mentorRowIndex + 1; ; r++) {
      const cell = sheet.getCell(r, mentorColIndex);
      if (!cell.value) break;
      const mentorId = hyperlink2userId(cell.hyperlink);
      mentor2score[mentorId] = sheet.getCell(r, 0).value as number;
    }

    const menteeId = hyperlink2userId(sheet.getCell(0, 0).hyperlink);
    mentee2map[menteeId] = mentor2score;
  }

  return await formatScoresCSV(mentee2map);
}

async function getUserName(id: string): Promise<string | null> {
  const u = await db.User.findByPk(id, { attributes: ["name"] });
  invariant(u, "User not found");
  return u.name;
}

/**
 * @param mentee2map A two-level map of mentee-id => mentor-id => score
 */
async function formatScoresCSV(
  mentee2map: Record<string, Record<string, number>>,
): Promise<CsvFormats> {
  // Get a full set of mentors.
  const mentors = new Set<string>();
  for (const v of Object.values(mentee2map)) {
    Object.keys(v).forEach(mentors.add, mentors);
  }
  const sortedMentors = [...mentors].sort(compareUUID);
  const sortedMentees = Object.keys(mentee2map).sort(compareUUID);

  // Generate CSVs
  const idHeader: string[] = ["学生"];
  const nameHeader: string[] = ["学生"];
  for (const mentorId of sortedMentors) {
    idHeader.push(mentorId);
    nameHeader.push(formatUserName(await getUserName(mentorId)));
  }

  const idRows: string[] = [];
  const nameRows: string[] = [];
  for (const menteeId of sortedMentees) {
    const name = await getUserName(menteeId);
    const scores = sortedMentors.map((m) => mentee2map[menteeId][m] ?? 0);
    idRows.push([menteeId, ...scores].join(","));
    nameRows.push([formatUserName(name), ...scores].join(","));
  }

  return {
    ids: [idHeader.join(","), ...idRows].join("\n"),
    names: [nameHeader.join(","), ...nameRows].join("\n"),
  };
}

type PerPairFeedbackAndScore = {
  menteeScore: number | undefined;
  menteeReason: string | undefined;
  mentorChoice: MentorMatchFeedbackChoice | undefined;
  mentorReason: string | undefined;
  score: number;
};

/**
 * @returns a map from mentee-id => mentor-id => PerPairFeedbackAndScore
 */
async function generateMatchFeedbackAndScoreMap(): Promise<
  Record<string, Record<string, PerPairFeedbackAndScore>>
> {
  const mentees = await listEligibleMentees();
  const mentors = await listEligibleMentors();

  const mentee2feedback: Record<string, MenteeMatchFeedback> = {};
  for (const m of mentees) {
    const f = await getLastMatchFeedback(m.id, "Mentee");
    if (f) {
      invariant(f.type == "Mentee", "wtf");
      mentee2feedback[m.id] = f;
    }
  }

  const mentor2feedback: Record<string, MentorMatchFeedback> = {};
  for (const m of mentors) {
    const f = await getLastMatchFeedback(m.user.id, "Mentor");
    if (f) {
      invariant(f.type == "Mentor", "wtf");
      mentor2feedback[m.user.id] = f;
    }
  }
  const ret: Record<string, Record<string, PerPairFeedbackAndScore>> = {};
  for (const mentee of mentees) {
    const mentor2fns: Record<string, PerPairFeedbackAndScore> = {};
    for (const mentor of mentors) {
      const pair = computeFinalMatchScore(
        mentee.id,
        mentor.user.id,
        mentee2feedback[mentee.id],
        mentor2feedback[mentor.user.id],
      );
      if (pair) mentor2fns[mentor.user.id] = pair;
    }
    ret[mentee.id] = mentor2fns;
  }

  return ret;
}

function computeFinalMatchScore(
  menteeId: string,
  mentorId: string,
  menteeFeedback: MenteeMatchFeedback | undefined,
  mentorFeedback: MentorMatchFeedback | undefined,
): PerPairFeedbackAndScore | null {
  const r: PerPairFeedbackAndScore = {
    menteeScore: undefined,
    menteeReason: undefined,
    mentorChoice: undefined,
    mentorReason: undefined,
    score: 0,
  };

  if (menteeFeedback) {
    const entry = menteeFeedback.mentors.find((m) => m.id == mentorId);
    r.menteeReason = entry?.reason;
    // Mentee score is between 1 and 5, as constraint by the UI
    r.menteeScore = entry?.score;

    const score = r.menteeScore ?? 0;
    invariant(score >= 0 && score <= 5, "Invalid mentee score");
    // Ban matching with least preferred menters
    r.score = score == 1 ? bannedScore : r.score + score;
  }

  if (mentorFeedback) {
    const entry = mentorFeedback.mentees.find((m) => m.id == menteeId);
    r.mentorChoice = entry?.choice;
    r.mentorReason = entry?.reason;

    /**
     * Mentor preference overrides mentee preference. For example, if a mentee
     * scores mentor A as 3 and mentor B as 5, and mentor A prefers the mentee
     * while mentor B is neutral, then the overall score should lean towards
     * mentor A.
     *
     * The reason is that the earlier steps of the matching process rely mostly
     * on the mentee's preference, and final score is the only chance to
     * consider the mentor's preference.
     *
     * Additionally, if a mentor feels good about a mentee, it's likely that the
     * feeling is mutual. So the chance that this algorithm leads to bad
     * matches is low.
     */
    if (r.mentorChoice == "Prefer") r.score += 10;
    else if (r.mentorChoice == "Avoid") r.score = bannedScore;
  }

  return r;
}

async function generateFinalScoresCSV(): Promise<CsvFormats> {
  const mentee2map = await generateMatchFeedbackAndScoreMap();

  const mentee2ScoreMap: Record<string, Record<string, number>> = {};
  for (const [menteeId, mentor2fns] of Object.entries(mentee2map)) {
    const mentor2score: Record<string, number> = {};
    for (const [mentorId, pair] of Object.entries(mentor2fns)) {
      mentor2score[mentorId] = pair.score;
    }
    mentee2ScoreMap[menteeId] = mentor2score;
  }
  return await formatScoresCSV(mentee2ScoreMap);
}

// Apply the output of the initial match solver to the database.
const applyInitialSolverOutput = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      output: z.string(),
      dryrun: z.boolean(),
    }),
  )
  .output(zInitialMatchSolution)
  .mutation(async ({ input: { output, dryrun } }) => {
    return await sequelize.transaction(async (transaction) => {
      const id2ids = parseSolverOutput(output);
      const batches = await listMentorSelectionBatches(
        Object.keys(id2ids),
        transaction,
      );

      const ret: InitialMatchSolution = [];
      for (const [menteeId, mentorIds] of Object.entries(id2ids)) {
        const mentee = await db.User.findByPk(menteeId, {
          attributes: [...minUserAttributes, "menteeApplication"],
          include: {
            association: "pointOfContact",
            attributes: minUserAttributes,
          },
          transaction,
        });
        if (!mentee) throw notFoundError("学生", menteeId);

        const mentors: MinUser[] = [];
        for (const mentorId of mentorIds) {
          const mentor = await db.User.findByPk(mentorId, {
            attributes: minUserAttributes,
            transaction,
          });
          if (!mentor) throw notFoundError("导师", mentorId);
          mentors.push(mentor);
        }

        const selections =
          batches[menteeId] && batches[menteeId].finalizedAt
            ? batches[menteeId].selections
            : [];

        ret.push({
          mentee,
          pointOfContact: mentee.pointOfContact,
          source: mentee.menteeApplication?.[menteeSourceField] ?? null,
          preferredMentors: selections
            .filter((s) => mentorIds.includes(s.mentor.id))
            .map((s) => s.mentor),
          excludedPreferredMentors: selections
            .filter((s) => !mentorIds.includes(s.mentor.id))
            .map((s) => s.mentor),
          nonPreferredMentors: mentors.filter(
            (m) => !selections.some((s) => s.mentor.id === m.id),
          ),
        });
      }

      if (!dryrun) {
        await createTransactionalMentorships(id2ids, transaction);
        await createMatchFeedback(id2ids, transaction);
      }

      return ret;
    });
  });

/**
 * @param output Output of the solver, each line of the output should be in the
 * format of "mentee_id,mentor_id1,mentor_id2...".
 * @returns a map from mentee id to mentor ids.
 */
function parseSolverOutput(output: string): Record<string, string[]> {
  const lines = output.split("\n");
  const result: Record<string, string[]> = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const ids = line.split(",");
    invariant(!result[ids[0]], "Mentee already exists");
    result[ids[0]] = ids.slice(1);
  }
  return result;
}

async function createTransactionalMentorships(
  menteeId2mentorIds: Record<string, string[]>,
  transaction: Transaction,
) {
  const endsAt = newTransactionalMentorshipEndsAt();
  for (const [menteeId, mentorIds] of Object.entries(menteeId2mentorIds)) {
    for (const mentorId of mentorIds) {
      const m = await db.Mentorship.findOne({
        where: { mentorId, menteeId },
        attributes: ["id", "transactional"],
      });
      if (!m) {
        await createMentorship(
          mentorId,
          menteeId,
          true,
          endsAt.toISOString(),
          transaction,
        );
      } else if (m.transactional) {
        await updateMentorship(m.id, true, endsAt.toISOString(), transaction);
      } else {
        throw generalBadRequestError(
          "一对一导师不能转换成不定期导师。" + "学生不应该选择曾经的一对一导师",
        );
      }
    }
  }
}

async function createRelationalMentorships(
  mentorId2menteeIds: Record<string, string[]>,
  transaction: Transaction,
) {
  for (const [mentorId, menteeIds] of Object.entries(mentorId2menteeIds)) {
    for (const menteeId of menteeIds) {
      const m = await db.Mentorship.findOne({
        where: { mentorId, menteeId },
        attributes: ["id"],
      });
      if (!m) {
        await createMentorship(mentorId, menteeId, false, null, transaction);
      } else {
        await updateMentorship(m.id, false, null, transaction);
      }
    }
  }
}

async function createMatchFeedback(
  menteeId2mentorIds: Record<string, string[]>,
  transaction: Transaction,
) {
  // Map from mentor id to mentee ids.
  const inverse: Record<string, string[]> = {};
  for (const [menteeId, mentorIds] of Object.entries(menteeId2mentorIds)) {
    for (const mentorId of mentorIds) {
      if (!inverse[mentorId]) inverse[mentorId] = [];
      inverse[mentorId].push(menteeId);
    }
    const menteeFeedback: MenteeMatchFeedback = {
      type: "Mentee",
      mentors: mentorIds.map((id) => ({ id })),
    };
    await db.MatchFeedback.create(
      {
        userId: menteeId,
        feedback: menteeFeedback,
      },
      { transaction },
    );
  }

  for (const [mentorId, menteeIds] of Object.entries(inverse)) {
    const mentorFeedback: MentorMatchFeedback = {
      type: "Mentor",
      mentees: menteeIds.map((id) => ({ id })),
    };
    await db.MatchFeedback.create(
      {
        userId: mentorId,
        feedback: mentorFeedback,
      },
      { transaction },
    );
  }
}

// Export spreadsheet for final match
const exportFinalSpreadsheet = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      documentId: z.string(),
      finalSolverOutput: z.string(),
    }),
  )
  .mutation(async ({ input: { documentId, finalSolverOutput } }) => {
    const doc = await loadGoogleSpreadsheet(documentId);
    await updateGoogleSpreadsheet(doc, [
      await formatFinalMatchWorksheet(finalSolverOutput),
    ]);
  });

async function formatFinalMatchWorksheet(finalSolverOutput: string) {
  const menteeId2mentorIds = parseSolverOutput(finalSolverOutput);
  const sortedMentees = (await listEligibleMentees()).sort((a, b) =>
    compareChinese(a.name, b.name),
  );
  const sortedMentors = (await listEligibleMentors())
    .sort((a, b) => compareChinese(a.user.name, b.user.name))
    .map((m) => m.user);
  const mentorId2Capacity = await listMentorCapacities();
  const mentee2map = await generateMatchFeedbackAndScoreMap();

  const rightCell = (v: any) => ({
    value: v,
    horizontalAlignment: "RIGHT",
  });

  const cells: any[][] = [];
  cells.push([
    null,
    null,
    ...sortedMentors.map((m) => rightCell(mentorHyperlink(m))),
  ]);
  cells.push([
    "容量",
    null,
    ...sortedMentors.map((m) => rightCell(mentorId2Capacity[m.id])),
  ]);
  cells.push([
    "匹配",
    null,
    ...sortedMentors.map((m, i) => {
      const col = sheetColumnLetter(i + 2);
      return rightCell(`=COUNTIF(${col}5:${col}, "*M*")`);
    }),
  ]);
  cells.push([
    "剩余",
    null,
    ...sortedMentors.map((m, i) => {
      const col = sheetColumnLetter(i + 2);
      return rightCell(`=${col}2-${col}3`);
    }),
  ]);

  for (const [i, mentee] of sortedMentees.entries()) {
    const menteeName = formatUserName(mentee.name);
    const row: any[] = [
      menteeHyperlink(mentee),
      rightCell(`=COUNTIF(C${i + 5}:ZZ${i + 5}, "*M*")`),
    ];
    for (const mentor of sortedMentors) {
      const pair = mentee2map[mentee.id][mentor.id];
      const empty =
        !pair ||
        (!pair.menteeScore &&
          !pair.menteeReason &&
          !pair.mentorChoice &&
          !pair.mentorReason &&
          !pair.score);
      if (empty) {
        row.push(null);
      } else {
        const mentorName = formatUserName(mentor.name);
        const matched = menteeId2mentorIds[mentee.id]?.includes(mentor.id);
        row.push({
          ...rightCell(matched ? `${pair.score}m` : pair.score),
          note:
            `${menteeName}: ${pair.menteeScore ?? "-"}｜${pair.menteeReason ?? "-"}` +
            `\n\n` +
            `${mentorName}: ${pair.mentorChoice ?? "-"}｜${pair.mentorReason ?? "-"}`,
        });
      }
    }
    cells.push(row);
  }

  return { title: "【定配】", cells };
}

function sheetColumnLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  const firstChar = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const secondChar = String.fromCharCode(65 + (index % 26));
  return firstChar + secondChar;
}

const applyFinalSolution = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      documentId: z.string(),
      dryrun: z.boolean(),
    }),
  )
  .output(zFinalMatchSolution)
  .mutation(async ({ input: { documentId, dryrun } }) => {
    const doc = await loadGoogleSpreadsheet(documentId);
    const sheet = doc.sheetsByTitle["【定配】"];
    if (!sheet) throw generalBadRequestError("工作表【定配】不存在");
    await sheet.loadCells();

    const ret: FinalMatchSolution = [];

    await sequelize.transaction(async (transaction) => {
      for (let r = 4; r < sheet.rowCount; r++) {
        for (let c = 2; c < sheet.columnCount; c++) {
          const cell = sheet.getCell(r, c);
          if (cell.value?.toString().toLowerCase().endsWith("m")) {
            const mentorId = hyperlink2userId(sheet.getCell(0, c).hyperlink);
            const menteeId = hyperlink2userId(sheet.getCell(r, 0).hyperlink);
            let entry = ret.find((e) => e.mentor.id == mentorId);
            if (!entry) {
              const mentor = await db.User.findByPk(mentorId, {
                attributes: minUserAttributes,
                transaction,
              });
              if (!mentor) throw notFoundError("导师", mentorId);
              entry = { mentor, mentees: [] };
              ret.push(entry);
            }
            const mentee = await db.User.findByPk(menteeId, {
              attributes: minUserAttributes,
              transaction,
            });
            if (!mentee) throw notFoundError("学生", menteeId);
            entry.mentees.push(mentee);
          }
        }
      }

      if (!dryrun) {
        const id2ids: Record<string, string[]> = {};
        for (const { mentor, mentees } of ret) {
          id2ids[mentor.id] = mentees.map((m) => m.id);
        }
        await createRelationalMentorships(id2ids, transaction);
      }
    });

    return ret;
  });

export default router({
  exportInitialSpreadsheet,
  generateInitialSolverInput,
  applyInitialSolverOutput,
  generateFinalSolverInput,
  exportFinalSpreadsheet,
  applyFinalSolution,
});
