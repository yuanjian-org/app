import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import {
  isEndedTransactionalMentorship,
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
 * If the current user is a MentorshipManager, return all mentorships of the
 * mentee. Otherwise, return only the mentorship of the mentee where the current
 * user is the mentor.
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
    async ({
      ctx: { user },
      input: { menteeId, includeEndedTransactional },
    }) => {
      const isPrivileged = isPermitted(user.roles, "MentorshipManager");

      return (
        await db.Mentorship.findAll({
          where: {
            menteeId,
            ...(isPrivileged ? {} : { mentorId: user.id }),
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
  .query(async ({ ctx, input: { as } }) => {
    return (
      await db.Mentorship.findAll({
        where: {
          [as === "Mentor" ? "mentorId" : "menteeId"]: ctx.user.id,
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
  .query(async ({ ctx, input: id }) => {
    const res = await db.Mentorship.findByPk(id, {
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    });
    if (!res || !(await isPermittedtoAccessMentee(ctx.user, res.mentee.id))) {
      throw noPermissionError("一对一匹配", id);
    }
    return res;
  });

export default router({
  create,
  get,
  update,
  updateSchedule,
  listMyMentorships,
  listMentorshipsForMentee,
  listOngoingRelationalMentorships,
});
