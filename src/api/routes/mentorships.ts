import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import {
  isEndedTransactionalMentorship,
  mentorDiscussionYellowThreshold,
  Mentorship,
  oneOnOneMeetingYellowThreshold,
  zMentorship,
  zMentorshipSchedule,
} from "../../shared/Mentorship";
import { z } from "zod";
import {
  alreadyExistsError,
  generalBadRequestError,
  noPermissionError,
  notFoundError,
} from "../errors";
import sequelize from "../database/sequelize";
import { isPermitted } from "../../shared/Role";
import {
  mentorshipAttributes,
  mentorshipInclude,
} from "../database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";
import { Op, Transaction } from "sequelize";
import { isPermittedtoAccessMentee } from "./users";
import { DateColumn, zNullableDateColumn } from "../../shared/DateColumn";
import { getLastMessageCreatedAtImpl } from "./chats";
import { compareDate, formatUserName } from "../../shared/strings";
import {
  mentorDiscussionMessagePrefix,
  oneOnOneMessagePrefix,
} from "../../shared/ChatMessage";
import moment from "moment";
import { emailRole } from "../email";
import getBaseUrl from "../../shared/getBaseUrl";

export const whereMentorshipIsOngoing = {
  [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gt]: new Date() } }],
};

const create = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      mentorId: z.string(),
      menteeId: z.string(),
      transactional: z.boolean(),
      endsAt: zNullableDateColumn,
    }),
  )
  .mutation(
    async ({ input: { mentorId, menteeId, transactional, endsAt } }) => {
      await sequelize.transaction(async (transaction) => {
        await createMentorship(
          mentorId,
          menteeId,
          transactional,
          endsAt,
          transaction,
        );
      });
    },
  );

/**
 * @returns the created group id
 */
export async function createMentorship(
  mentorId: string,
  menteeId: string,
  transactional: boolean,
  endsAt: DateColumn | null,
  transaction: Transaction,
): Promise<string> {
  const mentor = await db.User.findByPk(mentorId, { lock: true, transaction });
  const mentee = await db.User.findByPk(menteeId, { lock: true, transaction });
  if (!mentor || !mentee) {
    throw generalBadRequestError("无效用户ID");
  }

  // Assign appropriate roles.
  mentor.roles = [...mentor.roles.filter((r) => r != "Mentor"), "Mentor"];
  await mentor.save({ transaction });
  mentee.roles = [...mentee.roles.filter((r) => r != "Mentee"), "Mentee"];
  await mentee.save({ transaction });

  let mentorship;
  try {
    mentorship = await db.Mentorship.create(
      {
        mentorId,
        menteeId,
        transactional,
        endsAt,
      },
      { transaction },
    );
  } catch (e: any) {
    if ("name" in e && e.name === "SequelizeUniqueConstraintError") {
      throw alreadyExistsError("一对一匹配");
    }
  }

  // Create groups
  invariant(mentorship);
  return await createGroup(
    null,
    [mentorId, menteeId],
    mentorship.id,
    null,
    transaction,
  );
}

const update = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      mentorshipId: z.string(),
      transactional: z.boolean(),
      endsAt: zNullableDateColumn,
    }),
  )
  .mutation(async ({ input: { mentorshipId, transactional, endsAt } }) => {
    await sequelize.transaction(async (transaction) => {
      await updateMentorship(mentorshipId, transactional, endsAt, transaction);
    });
  });

const updateSchedule = procedure
  .use(authUser(["Mentor", "MentorshipManager"]))
  .input(
    z.object({
      mentorshipId: z.string(),
      schedule: zMentorshipSchedule,
    }),
  )
  .mutation(async ({ input: { mentorshipId, schedule } }) => {
    await db.Mentorship.update({ schedule }, { where: { id: mentorshipId } });
  });

export async function updateMentorship(
  mentorshipId: string,
  transactional: boolean,
  endsAt: DateColumn | null,
  transaction: Transaction,
) {
  const m = await db.Mentorship.findByPk(mentorshipId, {
    attributes: ["id", "transactional"],
    lock: true,
    transaction,
  });
  if (!m) throw notFoundError("一对一匹配", mentorshipId);

  // Also see the transition table in MentorshipsEditor()
  if (!m.transactional && transactional) {
    throw generalBadRequestError("一对一导师不能转换为不定期导师");
  }

  await m.update({ transactional, endsAt }, { transaction });
}

/**
 * If the current user is a MentorshipManager or MentoershipOperator, return all
 * mentorships of the mentee. Otherwise, return only the mentorship of the
 * mentee where the current user is the mentor.
 */
const listMentorshipsForMentee = procedure
  .use(authUser())
  .input(
    z.object({
      menteeId: z.string(),
      includeEndedTransactional: z.boolean(),
    }),
  )
  .output(z.array(zMentorship))
  .query(
    async ({ ctx: { me }, input: { menteeId, includeEndedTransactional } }) => {
      const isPrivileged = isPermitted(me.roles, [
        "MentorshipManager",
        "MentorshipOperator",
      ]);

      return (
        await db.Mentorship.findAll({
          where: {
            menteeId,
            ...(isPrivileged ? {} : { mentorId: me.id }),
          },
          attributes: mentorshipAttributes,
          include: mentorshipInclude,
        })
      ).filter(
        (m) => includeEndedTransactional || !isEndedTransactionalMentorship(m),
      );
    },
  );

/**
 * @returns the last meeting start time of the mentorship, or the last chat
 * message with 【一对一】 prefix, whichever is later.
 */
const getLastMeetingStartedAt = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .input(z.object({ mentorshipId: z.string() }))
  .output(zNullableDateColumn)
  .query(async ({ input: { mentorshipId } }) => {
    return await sequelize.transaction(async (transaction) => {
      return await getLastMeetingStartedAtImpl(mentorshipId, transaction);
    });
  });

async function getLastMeetingStartedAtImpl(
  mentorshipId: string,
  transaction: Transaction,
) {
  const m = await db.Mentorship.findByPk(mentorshipId, {
    attributes: ["menteeId"],
    include: [
      {
        association: "group",
        attributes: ["id"],
      },
    ],
    transaction,
  });
  if (!m) throw notFoundError("一对一匹配", mentorshipId);

  const groupId = m.group.id;
  const t = zNullableDateColumn.parse(
    await db.Transcript.max("startedAt", {
      where: { groupId },
      transaction,
    }),
  );
  const c = zNullableDateColumn.parse(
    await getLastMessageCreatedAtImpl(
      m.menteeId,
      oneOnOneMessagePrefix,
      transaction,
    ),
  );

  return compareDate(t, c) > 0 ? t : c;
}

/**
 * Return a map from user to the number of mentorships of this user as a mentor
 */
export async function getUser2MentorshipCount() {
  return (
    await db.Mentorship.findAll({
      where: { endsAt: null },
      attributes: [
        "mentorId",
        [sequelize.fn("COUNT", sequelize.col("mentorId")), "count"],
      ],
      group: ["mentorId"],
    })
  ).reduce<{ [key: string]: number }>((acc, cur) => {
    acc[cur.mentorId] = Number.parseInt(cur.getDataValue("count"));
    return acc;
  }, {});
}

const listMyMentorships = procedure
  .use(authUser())
  .input(
    z.object({
      as: z.enum(["Mentor", "Mentee"]),
    }),
  )
  .output(z.array(zMentorship))
  .query(async ({ ctx: { me }, input: { as } }) => {
    return (
      await db.Mentorship.findAll({
        where: {
          [as === "Mentor" ? "mentorId" : "menteeId"]: me.id,
        },
        attributes: mentorshipAttributes,
        include: mentorshipInclude,
      })
    ).filter((m) => !isEndedTransactionalMentorship(m));
  });

const listOngoingRelationalMentorships = procedure
  .use(authUser("MentorshipManager"))
  .output(z.array(zMentorship))
  .query(async () => {
    return await db.Mentorship.findAll({
      where: {
        ...whereMentorshipIsOngoing,
        transactional: false,
      },
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    });
  });

/**
 * Get all information of a mentorship including private notes.
 * Only accessible by the mentor and MentorshipManagers.
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zMentorship)
  .query(async ({ ctx: { me }, input: id }) => {
    return await sequelize.transaction(async (transaction) => {
      const res = await db.Mentorship.findByPk(id, {
        attributes: mentorshipAttributes,
        include: mentorshipInclude,
        transaction,
      });
      if (
        !res ||
        !(await isPermittedtoAccessMentee(me, res.mentee.id, transaction))
      ) {
        throw noPermissionError("一对一匹配", id);
      }
      return res;
    });
  });

/**
 * Send admin emails that list mentors who haven't had meetings with their
 * mentees for a while.
 */
export async function auditLastMentorshipMeetings() {
  type Pair = {
    mentorship: Mentorship;
    last: DateColumn | null;
  };

  const oneOnOneTooOld: Pair[] = [];
  const mentorDiscussionTooOld: Pair[] = [];

  await sequelize.transaction(async (transaction) => {
    // List all ongoing relational mentorships.
    const ms = await db.Mentorship.findAll({
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
      where: {
        ...whereMentorshipIsOngoing,
        transactional: false,
      },
      transaction,
    });

    for (const m of ms) {
      const last1v1 = await getLastMeetingStartedAtImpl(m.id, transaction);

      if (
        last1v1 === null ||
        moment().diff(last1v1, "days") > oneOnOneMeetingYellowThreshold
      ) {
        oneOnOneTooOld.push({ mentorship: m, last: last1v1 });
      }

      const lastDiscussion = await getLastMessageCreatedAtImpl(
        m.mentee.id,
        mentorDiscussionMessagePrefix,
        transaction,
      );

      if (
        lastDiscussion === null ||
        moment().diff(lastDiscussion, "days") > mentorDiscussionYellowThreshold
      ) {
        mentorDiscussionTooOld.push({ mentorship: m, last: lastDiscussion });
      }
    }
  });

  if (oneOnOneTooOld.length === 0 && mentorDiscussionTooOld.length === 0) {
    console.log("auditLastMentorshipMeetings found no violations");
    return;
  }

  const formatMentorship = (m: Mentorship) => `
    <a href="${getBaseUrl()}/mentees/${m.mentee.id}">
      ${formatUserName(m.mentor.name)} 
      =>
      ${formatUserName(m.mentee.name)} 
    </a>
  `;

  const oneOnOneTooOldText = oneOnOneTooOld
    .sort((a, b) => compareDate(a.last, b.last))
    .map(
      (p) => `
        ${formatMentorship(p.mentorship)}：
        ${p.last ? moment().diff(p.last, "days") + " 天前通话" : "尚未通话"}
      `,
    )
    .join("<br />");

  const mentorDiscussionTooOldText = mentorDiscussionTooOld
    .sort((a, b) => compareDate(a.last, b.last))
    .map(
      (p) => `
        ${formatMentorship(p.mentorship)}：
        ${p.last ? moment().diff(p.last, "days") + " 天前交流" : "尚未交流"}
      `,
    )
    .join("<br />");

  const message = `
    <b>以下师生长期未通话，请了解情况：</b>
    <br /><br />
    ${oneOnOneTooOldText}
    <br /><br />
    <b>以下导师长期未交流，请尽快预约交流：</b>
    <br /><br />
    ${mentorDiscussionTooOldText}
  `;

  await emailRole(
    "MentorshipManager",
    "导师长期未通话",
    // Shrink message. Otherwise mail server may complain about message size.
    message.replace(/\n/g, "").replace(/\s+/g, " "),
    getBaseUrl(),
  );
}

export default router({
  create,
  get,
  getLastMeetingStartedAt,
  update,
  updateSchedule,
  listMyMentorships,
  listMentorshipsForMentee,
  listOngoingRelationalMentorships,
});
