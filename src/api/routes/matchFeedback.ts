import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import {
  MatchFeedback,
  MatchFeedbackAndCreatedAt,
  MenteeMatchFeedback,
  MentorMatchFeedback,
  zMatchFeedback,
  zMatchFeedbackAndCreatedAt,
  zMenteeMatchFeedback,
  zMentorMatchFeedback,
} from "shared/MatchFeedback";
import { z } from "zod";
import db from "api/database/db";
import { minUserAttributes } from "api/database/models/attributesAndIncludes";
import invariant from "shared/invariant";
import { zMinUser } from "shared/User";
import { generalBadRequestError } from "api/errors";
import sequelize from "api/database/sequelize";

export async function listImpl(
  userId: string,
  transaction?: import("sequelize").Transaction,
): Promise<MatchFeedbackAndCreatedAt[]> {
  const feedbacks = await db.MatchFeedback.findAll({
    where: { userId },
    attributes: ["feedback", "createdAt"],
    transaction,
  });

  const getUser = async (id: string) => {
    const u = await db.User.findByPk(id, {
      attributes: minUserAttributes,
      transaction,
    });
    if (u) {
      return zMinUser.parse(u);
    } else {
      console.error(`User ${id} not found`);
      return null;
    }
  };

  const ret: MatchFeedbackAndCreatedAt[] = [];
  for (const f of feedbacks) {
    if (f.feedback.type == "Mentee") {
      const feedback: MenteeMatchFeedback = zMenteeMatchFeedback.parse(
        f.feedback,
      );
      for (const m of feedback.mentors) {
        const u = await getUser(m.id);
        if (!u) continue;
        m.user = u;
      }
      ret.push({
        feedback,
        createdAt: f.createdAt,
      });
    } else {
      invariant(f.feedback.type == "Mentor", "expect Mentor feedback");
      const feedback: MentorMatchFeedback = zMentorMatchFeedback.parse(
        f.feedback,
      );
      for (const m of feedback.mentees) {
        const u = await getUser(m.id);
        if (!u) continue;
        m.user = u;
      }
      ret.push({
        feedback,
        createdAt: f.createdAt,
      });
    }
  }
  return ret;
}

const list = procedure
  .use(authUser())
  .output(z.array(zMatchFeedbackAndCreatedAt))
  .query(async ({ ctx: { me } }) => {
    return await listImpl(me.id);
  });

export async function updateLastImpl(
  userId: string,
  input: MatchFeedback,
  transaction?: import("sequelize").Transaction,
) {
  const doUpdate = async (tx: import("sequelize").Transaction) => {
    const last = await db.MatchFeedback.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 1,
      attributes: ["id"],
      transaction: tx,
      lock: true,
    });
    if (!last) throw generalBadRequestError("没有找到反馈记录");
    await last.update({ feedback: input }, { transaction: tx });
  };

  if (transaction) {
    await doUpdate(transaction);
  } else {
    await sequelize.transaction(async (tx) => {
      await doUpdate(tx);
    });
  }
}

const updateLast = procedure
  .use(authUser())
  .input(zMatchFeedback)
  .mutation(async ({ ctx: { me }, input }) => {
    await updateLastImpl(me.id, input);
  });

const getLastMenteeMatchFeedback = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .input(z.object({ menteeId: z.string() }))
  .output(zMenteeMatchFeedback.nullable())
  .query(async ({ input: { menteeId } }) => {
    return (await getLastMatchFeedback(
      menteeId,
      "Mentee",
    )) as MenteeMatchFeedback | null;
  });

const getLastMentorMatchFeedback = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .input(z.object({ mentorId: z.string() }))
  .output(zMentorMatchFeedback.nullable())
  .query(async ({ input: { mentorId } }) => {
    return (await getLastMatchFeedback(
      mentorId,
      "Mentor",
    )) as MentorMatchFeedback | null;
  });

export async function getLastMatchFeedback(
  userId: string,
  type: "Mentee" | "Mentor",
  transaction?: import("sequelize").Transaction,
): Promise<MatchFeedback | null> {
  const row = await db.MatchFeedback.findOne({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: 1,
    attributes: ["feedback"],
    transaction,
  });
  const f = row?.feedback;
  return f && f.type == type ? zMatchFeedback.parse(f) : null;
}

export default router({
  list,
  updateLast,
  getLastMenteeMatchFeedback,
  getLastMentorMatchFeedback,
});
