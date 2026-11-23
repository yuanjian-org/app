import db from "../database/db";
import sequelize from "../database/sequelize";
import { Op, Transaction } from "sequelize";
import invariant from "../../shared/invariant";
import User, { getUserUrl, MinUser } from "../../shared/User";
import { formatUserName } from "../../shared/strings/formatUserName";
import { prettifyDate } from "../../shared/strings/prettifyDate";
import getBaseUrl from "../../shared/getBaseUrl";
import {
  chatMessageAttributes,
  chatMessageInclude,
  kudosAttributes,
  kudosInclude,
  minUserAttributes,
  shudongPostAttributes,
  taskAttributes,
  taskInclude,
  userAttributes,
} from "../database/models/attributesAndIncludes";
import moment, { Moment } from "moment-timezone";
import _ from "lodash";
import Role from "../../shared/Role";
import { ScheduledNotificationType } from "shared/ScheduledNotificationType";
import { castTask, isAutoTaskOrCreatorIsOther } from "./tasks";
import { getTaskMarkdown } from "../../shared/Task";
import markdown2html from "../../shared/markdown2html";
import { notify, notifyRolesIgnoreError } from "../notify";
import {
  isShudongGlobalSubscriber,
  shudongDailyDigestUserWhere,
  shudongGlobalSubscriberWhere,
} from "./shudongInternal";
import { getImpl as getGlobalConfig } from "./globalConfigs";
import ShudongPostModel from "../database/models/ShudongPost";
import { canAccessShudong } from "../../shared/ShudongPermissions";

export const shudongDailyDigestTimezone = "Asia/Shanghai";
export const shudongDailyDigestHour = 20;

/**
 * Computes the target send time for a ShudongDailyDigest scheduled row:
 * 20:00 Asia/Shanghai on the same calendar day if `createdAt` is strictly
 * before 20:00 Asia/Shanghai, otherwise 20:00 Asia/Shanghai on the next day.
 */
export function getNextShudongDailyDigestSendTime(
  createdAt: Date | Moment,
): Moment {
  const createdInChina = moment(createdAt).tz(shudongDailyDigestTimezone);
  const target = createdInChina
    .clone()
    .startOf("day")
    .hour(shudongDailyDigestHour);
  if (!createdInChina.isBefore(target)) {
    target.add(1, "day");
  }
  return target;
}

/**
 * Schedules a notification of the given type for the given subject, unless
 * one is already scheduled.
 *
 * IMPORTANT: Callers MUST call this function *before* saving the data (e.g.
 * kudos, chat messages, tasks, Shudong posts) that the notification is about.
 *
 * When sending notifications, `sendScheduledNotifications()` uses the
 * `createdAt` of the scheduled notification row as the lower bound timestamp,
 * and only includes data whose `createdAt` or `updatedAt` is on or after that
 * timestamp. If the data were saved before the notification is scheduled, the
 * data's timestamp would be earlier than the notification's, and the data
 * would be silently excluded from the notification.
 */
export async function scheduleNotificationBeforeSavingData(
  type: ScheduledNotificationType,
  subjectId: string,
  transaction: Transaction,
) {
  if (
    type === "ShudongQuestion" ||
    type === "ShudongResponse" ||
    type === "ShudongDailyDigest"
  ) {
    const globalConfig = await getGlobalConfig(transaction);
    if (globalConfig.enableShudongNotifications === false) {
      console.log(
        `Shudong notifications disabled globally. Skip scheduling ${type}`,
      );
      return;
    }
  }

  const count = await db.ScheduledNotification.count({
    where: { type, subjectId },
    transaction,
  });

  if (count > 0) {
    console.log(`${type} notification already scheduled for ${subjectId}`);
  } else {
    console.log(`scheduling ${type} notification for ${subjectId}`);
    await db.ScheduledNotification.create({ type, subjectId }, { transaction });
  }
}

const minDelayInMinutes = 5;

export async function sendScheduledNotifications(
  passedTransaction?: Transaction,
) {
  const doWork = async (transaction: Transaction) => {
    const all = await db.ScheduledNotification.findAll({
      attributes: ["id", "type", "subjectId", "createdAt"],
      transaction,
    });
    console.log(`Found ${all.length} scheduled notification`);

    for (const row of all) {
      const sendAfter =
        row.type === "ShudongDailyDigest"
          ? getNextShudongDailyDigestSendTime(row.createdAt)
          : moment(row.createdAt).add(minDelayInMinutes, "minutes");
      if (sendAfter.isAfter(moment())) {
        console.log(`Delaying notification with row id ${row.id}`);
        continue;
      }

      const timestamp = row.createdAt;

      switch (row.type) {
        case "Kudos":
          await notifyKudos(row.subjectId, timestamp, transaction);
          break;
        case "Chat":
          await notifyChats(row.subjectId, timestamp, transaction);
          break;
        case "Task":
          await notifyTasks(row.subjectId, timestamp, transaction);
          break;
        case "ShudongResponse":
          await notifyShudongResponses(row.subjectId, timestamp, transaction);
          break;
        case "ShudongQuestion":
          await notifyShudongQuestions(timestamp, transaction);
          break;
        case "ShudongDailyDigest":
          await notifyShudongDailyDigest(timestamp, transaction);
          break;
        default:
          invariant(false, `Unknown scheduled notification type: ${row.type}`);
      }

      await db.ScheduledNotification.destroy({
        where: { id: row.id },
        transaction,
      });
    }
  };

  if (passedTransaction) {
    await doWork(passedTransaction);
  } else {
    await sequelize.transaction(doWork);
  }
}

/**
 * Notifies globally subscribed users (see `shudongGlobalSubscriberWhere`)
 * that new Shudong questions have been posted since `timestamp`. The
 * templates take no variables; they simply tell users there are new
 * questions.
 */
async function notifyShudongQuestions(
  timestamp: Moment,
  transaction: Transaction,
) {
  const globalConfig = await getGlobalConfig(transaction);
  if (globalConfig.enableShudongNotifications === false) {
    console.log("Shudong notifications disabled globally.");
    return;
  }

  const newQuestions = await db.ShudongPost.findAll({
    where: {
      parentId: null,
      deletedAt: null,
      createdAt: isOnOrAfter(timestamp),
    },
    attributes: ["authorId"],
    transaction,
  });
  if (newQuestions.length === 0) return;
  for (const q of newQuestions) {
    invariant(q.authorId, "q.authorId must not be null");
  }

  const subscribers = await db.User.findAll({
    where: shudongGlobalSubscriberWhere,
    attributes: ["id", "roles", "menteeStatus", "mergedTo", "preference"],
    transaction,
  });

  // Skip unauthorized/merged users, daily-digest users, and users whose only
  // new questions are authored by themselves.
  const recipientIds = subscribers
    .filter(
      (u) =>
        !u.mergedTo &&
        canAccessShudong(u) &&
        u.preference?.shudongNotificationFrequency !== "daily",
    )
    .map((u) => u.id)
    .filter((id) => newQuestions.some((q) => q.authorId !== id));
  if (recipientIds.length === 0) return;

  await notify(
    "树洞",
    recipientIds,
    {
      email: "E_114705350039",
      domesticSms: "ep7Wd3",
      internationalSms: "DyvYZ",
    },
    {},
    transaction,
  );
}

async function notifyShudongResponses(
  questionId: string,
  timestamp: Moment,
  transaction: Transaction,
) {
  const globalConfig = await getGlobalConfig(transaction);
  if (globalConfig.enableShudongNotifications === false) {
    console.log("Shudong notifications disabled globally.");
    return;
  }

  const question = await db.ShudongPost.findByPk(questionId, {
    attributes: shudongPostAttributes,
    transaction,
  });
  if (!question || question.deletedAt !== null) return;

  const candidateResponses = await db.ShudongPost.findAll({
    where: {
      parentId: { [Op.ne]: null },
      deletedAt: null,
      createdAt: isOnOrAfter(timestamp),
    },
    attributes: shudongPostAttributes,
    transaction,
  });

  const postMap = new Map<string, typeof question | null>();
  const getPost = async (id: string) => {
    if (postMap.has(id)) return postMap.get(id)!;
    const p = await db.ShudongPost.findByPk(id, {
      attributes: shudongPostAttributes,
      transaction,
    });
    postMap.set(id, p);
    return p;
  };

  const newResponses: Array<typeof question> = [];
  for (const resp of candidateResponses) {
    let curr: typeof question | null = resp;
    while (curr && curr.parentId) {
      if (curr.parentId === questionId) {
        newResponses.push(resp);
        break;
      }
      curr = await getPost(curr.parentId);
    }
  }

  if (newResponses.length === 0) return;
  for (const r of newResponses) {
    invariant(r.authorId, "r.authorId must not be null");
  }

  const subscriptions = await db.ShudongSubscription.findAll({
    where: { questionId },
    attributes: ["userId"],
    include: [
      {
        association: "user",
        attributes: ["id", "roles", "menteeStatus", "mergedTo", "preference"],
      },
    ],
    transaction,
  });

  // Skip users without Shudong access (e.g., revoked roles/status or merged
  // accounts), daily-digest users, and subscribers whose only new responses
  // are authored by themselves. Send a single batched notify() call for all
  // eligible recipients to avoid triggering AoKSend rate limits.
  const recipientIds = subscriptions
    .filter(
      (s) =>
        Boolean(s.user && !s.user.mergedTo && canAccessShudong(s.user)) &&
        s.user?.preference?.shudongNotificationFrequency !== "daily",
    )
    .map((s) => s.userId)
    .filter((id) => newResponses.some((r) => r.authorId !== id));
  if (recipientIds.length === 0) return;

  await notify(
    "树洞",
    recipientIds,
    {
      email: "E_114703550737",
      domesticSms: "cFcyM4",
      internationalSms: "sVrjE",
    },
    {
      questionMarkdown: question.markdown,
      questionLink: `${getBaseUrl()}/shudong/${questionId}`,
    },
    transaction,
  );
}

function formatShudongQuestionPreview(markdown: string): string {
  const collapsed = markdown.replace(/\s+/g, " ").trim();
  const truncated =
    collapsed.length > 60 ? collapsed.slice(0, 60) + "..." : collapsed;
  return _.escape(truncated);
}

/**
 * Sends a personalized daily digest of new Shudong questions and subscribed
 * thread responses created since `timestamp` to each user who opted into
 * `shudongNotificationFrequency === "daily"`.
 */
async function notifyShudongDailyDigest(
  timestamp: Moment,
  transaction: Transaction,
) {
  const globalConfig = await getGlobalConfig(transaction);
  if (globalConfig.enableShudongNotifications === false) {
    console.log("Shudong notifications disabled globally.");
    return;
  }

  const digestUsers = (
    await db.User.findAll({
      where: shudongDailyDigestUserWhere,
      attributes: [
        "id",
        "name",
        "roles",
        "menteeStatus",
        "mergedTo",
        "preference",
      ],
      transaction,
    })
  ).filter((u) => !u.mergedTo && canAccessShudong(u));
  if (digestUsers.length === 0) return;

  const newQuestions = await db.ShudongPost.findAll({
    where: {
      parentId: null,
      deletedAt: null,
      createdAt: isOnOrAfter(timestamp),
    },
    order: [["createdAt", "ASC"]],
    attributes: shudongPostAttributes,
    transaction,
  });
  for (const q of newQuestions) {
    invariant(q.authorId, "q.authorId must not be null");
  }

  const candidateResponses = await db.ShudongPost.findAll({
    where: {
      parentId: { [Op.ne]: null },
      deletedAt: null,
      createdAt: isOnOrAfter(timestamp),
    },
    order: [["createdAt", "ASC"]],
    attributes: shudongPostAttributes,
    transaction,
  });
  if (newQuestions.length === 0 && candidateResponses.length === 0) return;
  for (const r of candidateResponses) {
    invariant(r.authorId, "r.authorId must not be null");
  }

  const postMap = new Map<string, ShudongPostModel | null>();
  for (const q of newQuestions) {
    postMap.set(q.id, q);
  }
  const getPost = async (id: string) => {
    if (postMap.has(id)) return postMap.get(id) ?? null;
    const p = await db.ShudongPost.findByPk(id, {
      attributes: shudongPostAttributes,
      transaction,
    });
    postMap.set(id, p);
    return p;
  };

  const responsesByQuestion = new Map<
    string,
    { question: ShudongPostModel; responses: ShudongPostModel[] }
  >();
  for (const resp of candidateResponses) {
    let curr: ShudongPostModel | null = resp;
    while (curr && curr.parentId) {
      curr = await getPost(curr.parentId);
    }
    if (!curr || curr.deletedAt !== null) continue;
    let entry = responsesByQuestion.get(curr.id);
    if (!entry) {
      entry = { question: curr, responses: [] };
      responsesByQuestion.set(curr.id, entry);
    }
    entry.responses.push(resp);
  }

  const activeQuestionIds = Array.from(responsesByQuestion.keys());
  const subscriptions =
    activeQuestionIds.length > 0
      ? await db.ShudongSubscription.findAll({
          where: {
            userId: { [Op.in]: digestUsers.map((u) => u.id) },
            questionId: { [Op.in]: activeQuestionIds },
          },
          attributes: ["userId", "questionId"],
          transaction,
        })
      : [];

  const userSubscriptions = new Map<string, Set<string>>();
  for (const sub of subscriptions) {
    let set = userSubscriptions.get(sub.userId);
    if (!set) {
      set = new Set<string>();
      userSubscriptions.set(sub.userId, set);
    }
    set.add(sub.questionId);
  }

  const baseUrl = getBaseUrl();

  for (const user of digestUsers) {
    const userNewQuestions = isShudongGlobalSubscriber(user)
      ? newQuestions.filter((q) => q.authorId !== user.id)
      : [];

    const subscribedIds = userSubscriptions.get(user.id) ?? new Set<string>();
    const updatedThreads: {
      question: ShudongPostModel;
      newResponseCount: number;
    }[] = [];
    for (const questionId of subscribedIds) {
      const entry = responsesByQuestion.get(questionId);
      if (!entry) continue;
      const otherResponses = entry.responses.filter(
        (r) => r.authorId !== user.id,
      );
      if (otherResponses.length > 0) {
        updatedThreads.push({
          question: entry.question,
          newResponseCount: otherResponses.length,
        });
      }
    }

    if (userNewQuestions.length === 0 && updatedThreads.length === 0) {
      continue;
    }

    const totalNewResponses = updatedThreads.reduce(
      (sum, t) => sum + t.newResponseCount,
      0,
    );
    const summaryParts: string[] = [];
    const htmlSections: string[] = [];

    if (userNewQuestions.length > 0) {
      summaryParts.push(`${userNewQuestions.length} 个新问题`);
      const items = userNewQuestions
        .map((q) => {
          const preview = formatShudongQuestionPreview(q.markdown);
          return `<li><a href="${baseUrl}/shudong/${q.id}">${preview}</a></li>`;
        })
        .join("");
      htmlSections.push(
        `<b>新问题（${userNewQuestions.length} 个）：</b><ul>${items}</ul>`,
      );
    }

    if (updatedThreads.length > 0) {
      summaryParts.push(`${totalNewResponses} 条新回复`);
      const items = updatedThreads
        .map(({ question: q, newResponseCount }) => {
          const preview = formatShudongQuestionPreview(q.markdown);
          return (
            `<li><a href="${baseUrl}/shudong/${q.id}">${preview}</a>` +
            `（${newResponseCount} 条新回复）</li>`
          );
        })
        .join("");
      htmlSections.push(
        `<b>订阅问题的新回复（${totalNewResponses} 条）：</b>` +
          `<ul>${items}</ul>`,
      );
    }

    await notify(
      "树洞",
      [user.id],
      {
        email: "E_114704061630",
        domesticSms: "c4qSN3",
        internationalSms: "zgkZJ3",
      },
      {
        name: formatUserName(user.name, "friendly"),
        summary: summaryParts.join("、"),
        delta: htmlSections.join(""),
        shudongLink: `${baseUrl}/shudong`,
      },
      transaction,
    );
  }
}

async function notifyTasks(
  assigneeId: string,
  timestamp: Moment,
  transaction: Transaction,
) {
  const tasks = await db.Task.findAll({
    where: {
      assigneeId,
      creatorId: isAutoTaskOrCreatorIsOther(assigneeId),
      done: false,
      updatedAt: isOnOrAfter(timestamp),
    },
    attributes: taskAttributes,
    include: taskInclude,
    transaction,
  });

  const assignee = await db.User.findByPk(assigneeId, {
    attributes: ["name", "state"],
    transaction,
  });
  if (!assignee) throw Error(`Assignee not found: ${assigneeId}`);

  const name = formatUserName(assignee.name, "friendly");
  const htmls = await Promise.all(
    tasks.map((t) => {
      const md = getTaskMarkdown(
        castTask(t),
        assignee.state ?? {},
        getBaseUrl(),
      );
      return markdown2html(md);
    }),
  );

  if (htmls.length === 0) {
    console.log(
      `No tasks to send to assignee ${assigneeId}, assuming assignee ` +
        `has completed the tasks that triggered this scheduled notification.`,
    );
    return;
  }

  const templateData = {
    name,
    delta: `<ul><li>${htmls.join("</li><li>")}</li></ul>`,
  };

  await notify(
    "待办事项",
    [assigneeId],
    {
      email: "E_114706042504",
      domesticSms: "rw7iV2",
      internationalSms: "iodG74",
    },
    templateData,
    transaction,
  );

  notifyRolesIgnoreError(
    ["SystemAlertSubscriber"],
    "发送待办事项邮件",
    JSON.stringify(templateData),
  );
}

function isOnOrAfter(timestamp: Moment) {
  return { [Op.gte]: timestamp.toISOString() };
}

function formatUserlink(u: MinUser) {
  return (
    `<a href="${getBaseUrl()}${getUserUrl(u)}">` +
    formatUserName(u.name, "formal") +
    `</a>`
  );
}

async function notifyKudos(
  receiverId: string,
  timestamp: Moment,
  transaction: Transaction,
) {
  const receiver = await db.User.findByPk(receiverId, {
    attributes: ["name", "likes", "kudos"],
    transaction,
  });
  if (!receiver) throw Error(`User not found: ${receiverId}`);

  const delta = await db.Kudos.findAll({
    where: {
      receiverId,
      createdAt: isOnOrAfter(timestamp),
    },
    attributes: kudosAttributes,
    include: kudosInclude,
    transaction,
  });

  const giver2user: Record<string, MinUser> = {};
  const giver2likes: Record<string, number> = {};
  const giver2kudos: Record<string, string[]> = {};
  for (const k of delta) {
    giver2user[k.giver.id] = k.giver;
    if (k.text === null) {
      giver2likes[k.giver.id] = (giver2likes[k.giver.id] ?? 0) + 1;
    } else {
      giver2kudos[k.giver.id] = [...(giver2kudos[k.giver.id] ?? []), k.text];
    }
  }

  const message = [
    ...Object.entries(giver2likes).map(([giverId, likes]) => {
      const giver = giver2user[giverId];
      return `${formatUserlink(giver)}刚刚给你点了 ${likes} 个赞`;
    }),
    ...Object.entries(giver2kudos).map(([giverId, kudos]) => {
      const giver = giver2user[giverId];
      const kudosText = kudos.map((k) => `“${k}”`).join("，");
      return `${formatUserlink(giver)}刚刚夸了你：<b>${kudosText}</b>`;
    }),
  ].join("<br />");

  const receiverName = formatUserName(receiver.name, "friendly");
  const templateData = {
    name: receiverName,
    delta: message,
    total: String((receiver.likes ?? 0) + (receiver.kudos ?? 0)),
  };

  await notify(
    "点赞",
    [receiverId],
    {
      email: "E_114706274956",
      domesticSms: "lQbr42",
      internationalSms: "GYEm92",
    },
    templateData,
    transaction,
  );

  notifyRolesIgnoreError(
    ["SystemAlertSubscriber"],
    "发送点赞通知",
    JSON.stringify(templateData),
  );
}

async function notifyChats(
  roomId: string,
  timestamp: Moment,
  transaction: Transaction,
) {
  const room = await db.ChatRoom.findByPk(roomId, {
    attributes: ["id"],
    include: [
      {
        association: "mentee",
        attributes: minUserAttributes,
      },
    ],
    transaction,
  });
  if (!room) throw Error(`Chat room not found: ${roomId}`);

  invariant(room.mentee, "Only mentee rooms are supported for now");

  /**
   * Compute receipients which should include mentors of all ongoing relational
   * mentorships and MentorshipAdmins.
   */
  const userId2receipients: Record<string, User> = {};

  // Force type check
  const role: Role = "MentorshipAdmin";
  (
    await db.User.findAll({
      where: { roles: { [Op.contains]: [role] } },
      attributes: userAttributes,
      transaction,
    })
  ).forEach((u) => (userId2receipients[u.id] = u));

  (
    await db.Mentorship.findAll({
      where: {
        menteeId: room.mentee.id,
        transactional: false,
        [Op.or]: [{ endsAt: isOnOrAfter(moment()) }, { endsAt: null }],
      },
      attributes: [],
      include: [
        {
          association: "mentor",
          attributes: userAttributes,
        },
      ],
      transaction,
    })
  ).forEach((m) => {
    userId2receipients[m.mentor.id] = m.mentor;
  });

  const delta = await db.ChatMessage.findAll({
    where: {
      roomId,
      [Op.or]: [
        { createdAt: isOnOrAfter(timestamp) },
        { updatedAt: isOnOrAfter(timestamp) },
      ],
    },
    attributes: chatMessageAttributes,
    include: chatMessageInclude,
    transaction,
  });

  const menteeName = formatUserName(room.mentee.name, "formal");

  await Promise.all(
    Object.values(userId2receipients).map(async (u) => {
      // Skip messages authored by the receipient themselves.
      const filtered = delta.filter((m) => m.user.id !== u.id);
      if (filtered.length === 0) return;

      // Display the name of the author if there is only one author, otherwise
      // display "多人".
      const authors =
        filtered
          .map((m) => m.user.id)
          .filter((id, i, arr) => arr.indexOf(id) === i).length === 1
          ? formatUserName(filtered[0].user.name)
          : "多人";

      invariant(room.mentee, "Only mentee rooms are supported for now");

      await notify(
        "内部笔记",
        [u.id],
        {
          email: "E_114702895735",
          domesticSms: "mUMBp2",
          internationalSms: "G9qHA3",
        },
        {
          menteeName,
          authors,
          roomLink: `${getBaseUrl()}/mentees/${room.mentee.id}`,
          delta: filtered
            .map((m) => {
              const verb = moment(m.createdAt).isAfter(timestamp)
                ? "新增"
                : `更新了${prettifyDate(m.createdAt)}创建的`;
              const truncated =
                m.markdown.length > 200
                  ? m.markdown.slice(0, 200) + "..."
                  : m.markdown;
              return (
                `<b>${formatUserlink(m.user)}${verb}笔记: </b>` +
                `<br /><br />` +
                // This is a big quotation mark.
                `<span style="color: gray;">❝</span>` +
                `${truncated}”`
              );
            })
            .join("<br /><br />"),
        },
        transaction,
      );
    }),
  );
}
