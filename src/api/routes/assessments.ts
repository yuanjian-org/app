import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { z } from "zod";
import { zAssessment } from "../../shared/Assessment";
import { noPermissionError, notFoundError } from "../errors";
import { assessmentAttributes } from "api/database/models/attributesAndIncludes";

/**
 * @returns the ID of the created assessment.
 */
const create = procedure
  .use(authUser("MentorshipAssessor"))
  .input(
    z.object({
      mentorshipId: z.string().uuid(),
    }),
  )
  .output(z.string())
  .mutation(async ({ input }) => {
    return (
      await db.Assessment.create({
        partnershipId: input.mentorshipId,
      })
    ).id;
  });

const update = procedure
  .use(authUser("MentorshipAssessor"))
  .input(
    z.object({
      id: z.string().uuid(),
      summary: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    const a = await db.Assessment.findByPk(input.id);
    if (!a) throw notFoundError("评估", input.id);
    await a.update({
      summary: input.summary,
    });
  });

const get = procedure
  .use(authUser("MentorshipAssessor"))
  .input(z.string())
  .output(zAssessment)
  .query(async ({ input: id }) => {
    const a = await db.Assessment.findByPk(id, {
      attributes: assessmentAttributes,
    });
    if (!a) throw notFoundError("评估", id);
    return a;
  });

/**
 * Only the mentor of the specified mentorship are allowed to access this API.
 */
const listAllForMentorship = procedure
  .use(authUser())
  .input(
    z.object({
      mentorshipId: z.string(),
    }),
  )
  .output(z.array(zAssessment))
  .query(async ({ ctx: { me }, input: { mentorshipId } }) => {
    const p = await db.Mentorship.findByPk(mentorshipId, {
      attributes: ["mentorId"],
    });
    if (p?.mentorId !== me.id) {
      throw noPermissionError("一对一匹配", mentorshipId);
    }

    return await db.Assessment.findAll({
      where: { partnershipId: mentorshipId },
      attributes: assessmentAttributes,
    });
  });

export default router({
  create,
  get,
  update,
  listAllForMentorship,
});
