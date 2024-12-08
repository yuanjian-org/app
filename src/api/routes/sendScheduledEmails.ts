import db from "api/database/db";
import {
  likeAttributes,
  likeInclude,
  minUserAttributes,
} from "api/database/models/attributesAndIncludes";
import sequelize from "api/database/sequelize";
import { Transaction } from "sequelize";
import { ScheduledLikeEmailData } from "shared/ScheduledEmail";
import invariant from "tiny-invariant";
import { Like } from "shared/Like";
import { getUserUrl, MinUser } from "shared/User";
import { formatUserName } from "shared/strings";
import getBaseUrl from "shared/getBaseUrl";
import { email, emailRoleIgnoreError } from "../sendgrid";

export default async function sendScheduledEmails() {
  await sequelize.transaction(async transaction => {
    const all = await db.ScheduledEmail.findAll({
      attributes: ["id","data", "updatedAt"],
      transaction,
    });
    console.log(`Found ${all.length} scheduled emails`);

    for (const row of all) {
      switch (row.data.type) {
        case "Like":
          await sendLikeEmail(row.id, row.data, row.updatedAt, transaction);
      }
    }
  });
}

const likeEmailMinDelayInMinutes = 5;

async function sendLikeEmail(
  rowId: string,
  data: ScheduledLikeEmailData,
  updatedAt: Date,
  transaction: Transaction,
) {
  invariant(data.type === "Like");

  if (updatedAt.getTime() + likeEmailMinDelayInMinutes * 60 * 1000
    > Date.now()) {
    console.log(`Delaying Like email for ${data.userId}`);
    return;
  }

  const user = await db.User.findByPk(data.userId, { 
    attributes: ["email", "name"],
    transaction,
  });
  if (!user) throw Error(`User not found: ${data.userId}`);

  const likersBefore: MinUser[] = await db.User.findAll({
    where: { id: data.before.map(l => l.likerId) },
    attributes: minUserAttributes,
    transaction,
  });

  const before: Like[] = likersBefore.map(l => ({
    liker: l,
    count: data.before.find(b => b.likerId === l.id)?.count ?? 0,
  }));

  const after: Like[] = await db.Like.findAll({
    where: { userId: data.userId },
    attributes: likeAttributes,
    include: likeInclude,
    transaction,
  });

  const delta: Like[] = after.map(a => ({
    liker: a.liker,
    count: a.count - (before.find(b => b.liker.id === a.liker.id)?.count ?? 0),
  })).filter(l => l.count !== 0);

  const name = formatUserName(user.name, "friendly");
  const personalizations = [{
    to: {
      email: user.email,
      name,
    },
    dynamicTemplateData: {
      name,
      total: after.reduce((acc, l) => acc + l.count, 0),
      delta: delta.map(l =>
        `<a href="${getBaseUrl()}${getUserUrl(l.liker)}">` +
        formatUserName(l.liker.name, "formal") +
        `</a>刚刚给你点了 ${l.count} 个赞`,
      ).join("，"),
    },
  }];

  await email("d-cc3da26ada1a40318440dfebe5e57aa9", personalizations,
    getBaseUrl());

  emailRoleIgnoreError("SystemAlertSubscriber", "发送点赞邮件（Like Email)",
    JSON.stringify(personalizations), getBaseUrl());

  await db.ScheduledEmail.destroy({
    where: { id: rowId },
    transaction,
  });
}
