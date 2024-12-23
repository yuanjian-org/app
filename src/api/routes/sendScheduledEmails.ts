import db from "api/database/db";
import sequelize from "api/database/sequelize";
import { Op, Transaction } from "sequelize";
import { ScheduledKudosEmail } from "shared/ScheduledEmail";
import invariant from "tiny-invariant";
import { getUserUrl, MinUser } from "shared/User";
import { formatUserName } from "shared/strings";
import getBaseUrl from "shared/getBaseUrl";
import { email, emailRoleIgnoreError } from "../sendgrid";
import {
  kudosAttributes,
  kudosInclude,
} from "api/database/models/attributesAndIncludes";
import moment from "moment";

export default async function sendScheduledEmails() {
  await sequelize.transaction(async transaction => {
    const all = await db.ScheduledEmail.findAll({
      attributes: ["id","data", "createdAt"],
      transaction,
    });
    console.log(`Found ${all.length} scheduled emails`);

    for (const row of all) {
      switch (row.data.type) {
        case "Kudos":
          await sendKudosEmail(row.id, row.data, row.createdAt, transaction);
      }
    }
  });
}

async function sendKudosEmail(
  rowId: string,
  data: ScheduledKudosEmail,
  createdAt: Date,
  transaction: Transaction,
) {
  invariant(data.type === "Kudos");

  const minDelayInMinutes = 5;

  if (createdAt.getTime() + minDelayInMinutes * 60 * 1000
    > Date.now()) {
    console.log(`Delaying Kudos email for ${data.receiverId}`);
    return;
  }

  const receiver = await db.User.findByPk(data.receiverId, { 
    attributes: ["email", "name", "likes", "kudos"],
    transaction,
  });
  if (!receiver) throw Error(`User not found: ${data.receiverId}`);

  const delta = await db.Kudos.findAll({
    where: {
      receiverId: data.receiverId,
      createdAt: {
        // Offset by 1 second to counter any effect of time skew at commit time.
        [Op.gte]: moment(createdAt).subtract(1, 'second').toISOString(),
      },
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

  const link = (u: MinUser) => `<a href="${getBaseUrl()}${getUserUrl(u)}">` +
      formatUserName(u.name, "formal") +
  `</a>`;

  const message = [
    ...Object.entries(giver2likes).map(([giverId, likes]) => {
      const giver = giver2user[giverId];
      return `${link(giver)}刚刚给你点了 ${likes} 个赞`;
    }),
    ...Object.entries(giver2kudos).map(([giverId, kudos]) => {
      const giver = giver2user[giverId];
      const kudosText = kudos.map(k => `“${k}”`).join("，");
      return `${link(giver)}刚刚夸了你：<b>${kudosText}</b>`;
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

  emailRoleIgnoreError("SystemAlertSubscriber", "发送夸夸邮件（Kudos Email)",
    JSON.stringify(personalizations), getBaseUrl());

  await db.ScheduledEmail.destroy({
    where: { id: rowId },
    transaction,
  });
}
