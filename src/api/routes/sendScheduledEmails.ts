import db from "api/database/db";
import sequelize from "api/database/sequelize";
import { Op, Transaction } from "sequelize";
import { ScheduledChatEmail, ScheduledKudosEmail } from "shared/ScheduledEmail";
import invariant from "tiny-invariant";
import User, { getUserUrl, MinUser } from "shared/User";
import { formatUserName, prettifyDate } from "shared/strings";
import getBaseUrl from "shared/getBaseUrl";
import { email, emailRoleIgnoreError } from "../sendgrid";
import {
  chatMessageAttributes,
  chatMessageInclude,
  kudosAttributes,
  kudosInclude, minUserAttributes, userAttributes
} from "api/database/models/attributesAndIncludes";
import moment, { Moment } from "moment";
import Role from "shared/Role";

const minDelayInMinutes = 5;

export default async function sendScheduledEmails() {
  await sequelize.transaction(async transaction => {
    const all = await db.ScheduledEmail.findAll({
      attributes: ["id", "data", "createdAt"],
      transaction,
    });
    console.log(`Found ${all.length} scheduled emails`);

    for (const row of all) {
      if (row.createdAt.getTime() + minDelayInMinutes * 60 * 1000 > Date.now()) {
        console.log(`Delaying email with row id ${row.id}`);
        continue;
      }

      // Offset by 1 second to counter any time skew at commit time.
      const timestamp = moment(row.createdAt).subtract(1, 'second');

      switch (row.data.type) {
        case "Kudos":
          await sendKudosEmail(row.data, timestamp, transaction);
          break;
        case "Chat":
          await sendChatEmail(row.data, timestamp, transaction);
          break;
      }

      await db.ScheduledEmail.destroy({
        where: { id: row.id },
        transaction,
      });
    }
  });
}

function formatUserlink(u: MinUser) {
  return `<a href="${getBaseUrl()}${getUserUrl(u)}">` +
    formatUserName(u.name, "formal") +
    `</a>`;
}

async function sendKudosEmail(
  data: ScheduledKudosEmail,
  timestamp: Moment,
  transaction: Transaction,
) {
  invariant(data.type === "Kudos");

  const receiver = await db.User.findByPk(data.receiverId, { 
    attributes: ["email", "name", "likes", "kudos"],
    transaction,
  });
  if (!receiver) throw Error(`User not found: ${data.receiverId}`);

  const delta = await db.Kudos.findAll({
    where: {
      receiverId: data.receiverId,
      createdAt: { [Op.gte]: timestamp.toISOString() },
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
      const kudosText = kudos.map(k => `“${k}”`).join("，");
      return `${formatUserlink(giver)}刚刚夸了你：<b>${kudosText}</b>`;
    }),
  ].join("<br />");
  
  const receiverName = formatUserName(receiver.name, "friendly");
  const personalizations = [{
    to: {
      email: receiver.email,
      name: receiverName,
    },
    dynamicTemplateData: {
      name: receiverName,
      delta: message,
      total: (receiver.likes ?? 0) + (receiver.kudos ?? 0),
    },
  }];

  await email("d-cc3da26ada1a40318440dfebe5e57aa9", personalizations,
    getBaseUrl());

  emailRoleIgnoreError("SystemAlertSubscriber", "发送点赞邮件（Kudos Email)",
    JSON.stringify(personalizations), getBaseUrl());
}


async function sendChatEmail(
  data: ScheduledChatEmail,
  timestamp: Moment,
  transaction: Transaction,
) {
  invariant(data.type === "Chat");

  const room = await db.ChatRoom.findByPk(data.roomId, { 
    attributes: ["id"],
    include: [{
      association: 'mentee',
      attributes: minUserAttributes,
    }],
    transaction,
  });
  if (!room) throw Error(`Chat room not found: ${data.roomId}`);

  // We only support mentee rooms for now.
  invariant(room.mentee);

  /**
   * Compute receipients which should include mentors of all ongoing relational
   * mentorships, their coaches, and MentorshipManagers.
   */
  const userId2receipients: Record<string, User> = {};

  const role: Role = "MentorshipManager";
  (await db.User.findAll({
    where: { roles: { [Op.contains]: [role] } },
    attributes: userAttributes,
    transaction,
  })).forEach(u => userId2receipients[u.id] = u);

  (await db.Mentorship.findAll({
    where: {
      menteeId: room.mentee.id,
      transactional: false,
      [Op.or]: [
        { endsAt: { [Op.gt]: moment().toISOString() } },
        { endsAt: null },
      ],
    },
    attributes: [],
    include: [{
      association: 'mentor',
      attributes: userAttributes,
      include: [{
        association: 'coach',
        attributes: userAttributes,
      }],
    }],
    transaction,
  })).forEach(m => {
    userId2receipients[m.mentor.id] = m.mentor;
    if (m.mentor.coach) {
      userId2receipients[m.mentor.coach.id] = m.mentor.coach;
    }
  });

  const delta = await db.ChatMessage.findAll({
    where: {
      roomId: data.roomId,
      [Op.or]: [
        { createdAt: { [Op.gte]: timestamp.toISOString() } },
        { updatedAt: { [Op.gte]: timestamp.toISOString() } },
      ],
    },
    attributes: chatMessageAttributes,
    include: chatMessageInclude,
    transaction,
  });

  const menteeName = formatUserName(room.mentee.name, "formal");

  await Promise.all(Object.values(userId2receipients).map(async u => {
    // Skip messages authored by the receipient themselves.
    const filtered = delta.filter(m => m.user.id !== u.id);
    if (filtered.length === 0) return;

    // Display the name of the author if there is only one author, otherwise
    // display "多人".
    const authors = filtered
      .map(m => m.user.id)
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .length === 1 ? formatUserName(filtered[0].user.name, "friendly") : "多人";

    const toName = formatUserName(u.name, "friendly");

    invariant(room.mentee);
    const personalizations = [{
      to: {
        email: u.email,
        name: toName,
      },
      dynamicTemplateData: {
        toName,
        menteeName,
        authors,
        roomLink: `${getBaseUrl()}/mentees/${room.mentee.id}`,
        delta: filtered.map(m => {
          const verb = moment(m.createdAt).isAfter(timestamp) ? "新增" :
            `更新了${prettifyDate(m.createdAt)}创建的`;
          const truncated = m.markdown.length > 200 ?
            m.markdown.slice(0, 200) + "..." : m.markdown;
          return `<b>${formatUserlink(m.user)}${verb}笔记: </b>` +
            `<br /><br />` +
            // This is a big quotation mark.
            `<span style="color: gray;">❝</span>` +
            `${truncated}”`;
        }).join("<br /><br />"),
      },
    }];
  
    await email("d-443c3f57bd47425b818d52bcd32bbb08", personalizations,
      getBaseUrl());
  }));
}
