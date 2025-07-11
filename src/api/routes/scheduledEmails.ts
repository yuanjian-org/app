import db from "../database/db";
import sequelize from "../database/sequelize";
import { Op, Transaction } from "sequelize";
import invariant from "../../shared/invariant";
import User, { getUserUrl, MinUser } from "../../shared/User";
import { formatUserName, prettifyDate } from "../../shared/strings";
import getBaseUrl from "../../shared/getBaseUrl";
import { email, emailRoleIgnoreError } from "../email";
import {
  chatMessageAttributes,
  chatMessageInclude,
  kudosAttributes,
  kudosInclude,
  minUserAttributes,
  taskAttributes,
  taskInclude,
  userAttributes,
} from "../database/models/attributesAndIncludes";
import moment, { Moment } from "moment";
import Role from "../../shared/Role";
import { ScheduledEmailType } from "../../shared/ScheduledEmailType";
import { castTask, isAutoTaskOrCreatorIsOther } from "./tasks";
import { getTaskMarkdown } from "../../shared/Task";
import markdown2html from "../../shared/markdown2html";

export async function scheduleEmail(
  type: ScheduledEmailType,
  subjectId: string,
  transaction: Transaction,
) {
  const count = await db.ScheduledEmail.count({
    where: { type, subjectId },
    transaction,
  });

  if (count > 0) {
    console.log(`${type} email already scheduled for ${subjectId}`);
  } else {
    console.log(`scheduling ${type} email for ${subjectId}`);
    await db.ScheduledEmail.create({ type, subjectId }, { transaction });
  }
}

const minDelayInMinutes = 5;

export async function sendScheduledEmails() {
  await sequelize.transaction(async (transaction) => {
    const all = await db.ScheduledEmail.findAll({
      attributes: ["id", "type", "subjectId", "createdAt"],
      transaction,
    });
    console.log(`Found ${all.length} scheduled emails`);

    for (const row of all) {
      const delayed = moment(row.createdAt).add(minDelayInMinutes, "minutes");
      if (delayed.isAfter(moment())) {
        console.log(`Delaying email with row id ${row.id}`);
        continue;
      }

      // Offset by 1 second to counter any time skew at commit time.
      const timestamp = moment(row.createdAt).subtract(1, "second");

      switch (row.type) {
        case "Kudos":
          await sendKudosEmail(row.subjectId, timestamp, transaction);
          break;
        case "Chat":
          await sendChatEmail(row.subjectId, timestamp, transaction);
          break;
        case "Task":
          await sendTaskEmail(row.subjectId, timestamp, transaction);
          break;
        default:
          invariant(false, `Unknown scheduled email type: ${row.type}`);
      }

      await db.ScheduledEmail.destroy({
        where: { id: row.id },
        transaction,
      });
    }
  });
}

async function sendTaskEmail(
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
    attributes: ["email", "name", "state"],
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
      `No tasks to send to assignee ${assigneeId}, assuming ` +
        `assignee has completed the tasks that triggered this scheduled email.`,
    );
    return;
  }

  const templateData = {
    name,
    delta: `<ul><li>${htmls.join("</li><li>")}</li></ul>`,
  };

  await email([assignee.email], "E_114706042504", templateData, getBaseUrl());

  emailRoleIgnoreError(
    "SystemAlertSubscriber",
    "发送待办事项邮件",
    JSON.stringify(templateData),
    getBaseUrl(),
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

async function sendKudosEmail(
  receiverId: string,
  timestamp: Moment,
  transaction: Transaction,
) {
  const receiver = await db.User.findByPk(receiverId, {
    attributes: ["email", "name", "likes", "kudos"],
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

  await email([receiver.email], "E_114706274956", templateData, getBaseUrl());

  emailRoleIgnoreError(
    "SystemAlertSubscriber",
    "发送点赞邮件",
    JSON.stringify(templateData),
    getBaseUrl(),
  );
}

async function sendChatEmail(
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
   * mentorships and MentorshipManagers.
   */
  const userId2receipients: Record<string, User> = {};

  // Force type check
  const role: Role = "MentorshipManager";
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
          ? formatUserName(filtered[0].user.name, "friendly")
          : "多人";

      invariant(room.mentee, "Only mentee rooms are supported for now");

      await email(
        [u.email],
        "E_114702895735",
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
        getBaseUrl(),
      );
    }),
  );
}
