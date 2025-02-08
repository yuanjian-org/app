import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { MatchFeedbackAndCreatedAt, MenteeMatchFeedback, MentorMatchFeedback, zMatchFeedback, zMatchFeedbackAndCreatedAt, zMenteeMatchFeedback, zMentorMatchFeedback } from "shared/MatchFeedback";
import { z } from "zod";
import db from "api/database/db";
import { minUserAttributes } from "api/database/models/attributesAndIncludes";
import invariant from "shared/invariant";
import { zMinUser } from "shared/User";
import { generalBadRequestError } from "api/errors";
import sequelize from "api/database/sequelize";

const list = procedure
  .use(authUser())
  .output(z.array(zMatchFeedbackAndCreatedAt))
  .query(async ({ ctx: { user } }) =>
{
  const feedbacks = await db.MatchFeedback.findAll({
    where: { userId: user.id },
    attributes: ["feedback", "createdAt"],
  });

  const getUser = async (id: string) => {
    const u = await db.User.findByPk(id, {
      attributes: minUserAttributes,
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
      const feedback: MenteeMatchFeedback = zMenteeMatchFeedback.parse(f.feedback);
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
      const feedback: MentorMatchFeedback = zMentorMatchFeedback.parse(f.feedback);
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
});

const updateLast = procedure
  .use(authUser())
  .input(zMatchFeedback)
  .mutation(async ({ ctx: { user }, input }) =>
{
  await sequelize.transaction(async transaction => {
    const last = await db.MatchFeedback.findOne({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
      limit: 1,
      attributes: ["id"],
      transaction,
      lock: true,
    });
    if (!last) throw generalBadRequestError("没有找到反馈记录");
    await last.update({ feedback: input }, { transaction });
  });
});

export default router({
  list,
  updateLast,
});
